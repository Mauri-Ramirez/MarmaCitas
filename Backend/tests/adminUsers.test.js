import { test, before, after, beforeEach } from "node:test";

import assert from "node:assert/strict";

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Specialty from "../models/Specialty.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import { getUsers } from "../controllers/userController.js";

const TEST_DB_NAME = "marmacitas_test";

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI no está configurada.");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET no está configurada.");
}

// Igual que en las demás suites: la opción dbName tiene
// prioridad sobre la base de datos del URI.
before(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: TEST_DB_NAME,
    serverSelectionTimeoutMS: 30000,
  });

  await Promise.all([User.init(), Specialty.init()]);
});

after(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Specialty.deleteMany({})]);
});

let sequence = 0;

const uniqueSuffix = () =>
  `${Date.now()}_${++sequence}_${Math.floor(Math.random() * 1e6)}`;

const createUser = async (role = "patient", extra = {}) => {
  const suffix = uniqueSuffix();

  const data = {
    name: `Usuario ${suffix}`,
    email: `usuario.${suffix}@test.local`,
    password: "password123",
    role,
    active: true,
    ...extra,
  };

  return User.create(data);
};

const createDoctor = async () => {
  const suffix = uniqueSuffix();

  const specialty = await Specialty.create({
    name: `Especialidad ${suffix}`,
  });

  return User.create({
    name: `Doctor ${suffix}`,
    email: `doctor.${suffix}@test.local`,
    password: "password123",
    role: "doctor",
    active: true,
    professionalLicense: `LIC-${suffix}`,
    phone: "3000000000",
    specialty: specialty._id,
  });
};

const signToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

const runChain = (middlewares, req) =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve({ status: this.statusCode, body: payload });
      },
    };

    let index = 0;

    const next = () => {
      if (index >= middlewares.length) {
        resolve({ status: null, body: null, reachedEnd: true });
        return;
      }

      const middleware = middlewares[index++];

      Promise.resolve(middleware(req, res, next)).catch((error) =>
        resolve({ status: 500, body: null, thrown: error }),
      );
    };

    next();
  });

const listUsers = async (user, query = {}) =>
  runChain(
    [verifyToken, requireRole("admin"), getUsers],
    {
      headers: { authorization: `Bearer ${signToken(user)}` },
      query,
    },
  );

test("el administrador lista usuarios con paginación y sin exponer la contraseña", async () => {
  const admin = await createUser("admin");
  await createUser("patient");
  await createUser("receptionist");

  const result = await listUsers(admin, { page: "1", limit: "10" });

  assert.equal(result.status, 200);
  assert.equal(result.body.users.length, 3);
  assert.equal(result.body.pagination.total, 3);
  assert.equal(result.body.pagination.page, 1);
  assert.equal(result.body.pagination.limit, 10);

  for (const user of result.body.users) {
    assert.ok(user.password === undefined, "No debe exponerse la contraseña");
  }
});

test("el filtro role=doctor retorna solo odontólogos con su especialidad poblada", async () => {
  const admin = await createUser("admin");
  const doctor = await createDoctor();
  await createUser("patient");

  const result = await listUsers(admin, { role: "doctor" });

  assert.equal(result.status, 200);
  assert.equal(result.body.users.length, 1);
  assert.equal(result.body.users[0].role, "doctor");
  assert.equal(
    String(result.body.users[0].specialty._id),
    String(doctor.specialty._id),
  );
  assert.ok(result.body.users[0].specialty.name);
});

test("el filtro role=patient retorna solo pacientes", async () => {
  const admin = await createUser("admin");
  await createDoctor();
  await createUser("patient");
  await createUser("patient");

  const result = await listUsers(admin, { role: "patient" });

  assert.equal(result.status, 200);
  assert.equal(result.body.users.length, 2);

  for (const user of result.body.users) {
    assert.equal(user.role, "patient");
  }
});

test("rol inválido responde 400", async () => {
  const admin = await createUser("admin");

  const result = await listUsers(admin, { role: "superuser" });

  assert.equal(result.status, 400);
});

test("la búsqueda por nombre y por correo encuentra coincidencias", async () => {
  const admin = await createUser("admin");
  const patient = await createUser("patient", {
    name: "María Prueba Única",
    email: "maria.prueba@test.local",
  });

  const byName = await listUsers(admin, { search: "prueba única" });

  assert.equal(byName.status, 200);
  assert.equal(byName.body.users.length, 1);
  assert.equal(
    String(byName.body.users[0]._id),
    String(patient._id),
  );

  const byEmail = await listUsers(admin, { search: "maria.prueba@test.local" });

  assert.equal(byEmail.status, 200);
  assert.equal(byEmail.body.users.length, 1);
  assert.equal(
    String(byEmail.body.users[0]._id),
    String(patient._id),
  );
});

test("límites de paginación inválidos responden 400", async () => {
  const admin = await createUser("admin");

  const overLimit = await listUsers(admin, { limit: "51" });

  assert.equal(overLimit.status, 400);

  const zeroPage = await listUsers(admin, { page: "0" });

  assert.equal(zeroPage.status, 400);

  const nonNumeric = await listUsers(admin, { page: "abc" });

  assert.equal(nonNumeric.status, 400);
});

test("parámetros desconocidos responden 400", async () => {
  const admin = await createUser("admin");

  const result = await listUsers(admin, { hacker: "1" });

  assert.equal(result.status, 400);
  assert.match(result.body.message, /hacker/);
});

test("roles sin permiso reciben 403 del middleware", async () => {
  const receptionist = await createUser("receptionist");
  const patient = await createUser("patient");

  const asReceptionist = await listUsers(receptionist, {});

  assert.equal(asReceptionist.status, 403);

  const asPatient = await listUsers(patient, {});

  assert.equal(asPatient.status, 403);
});

test("la paginación retorna la segunda página correctamente", async () => {
  const admin = await createUser("admin");
  await createUser("patient");
  await createUser("patient");
  await createUser("patient");

  const result = await listUsers(admin, { page: "2", limit: "2" });

  assert.equal(result.status, 200);
  assert.equal(result.body.users.length, 2);
  assert.equal(result.body.pagination.page, 2);
  assert.equal(result.body.pagination.total, 4);
  assert.equal(result.body.pagination.pages, 2);
});
