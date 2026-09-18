import { test, before, after, beforeEach } from "node:test";

import assert from "node:assert/strict";

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Specialty from "../models/Specialty.js";

import verifyToken from "../middlewares/authMiddleware.js";
import { getDoctors } from "../controllers/doctorController.js";

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

const createSpecialty = async ({ active = true } = {}) =>
  Specialty.create({
    name: `Especialidad ${uniqueSuffix()}`,
    active,
  });

const createDoctor = async ({
  active = true,
  specialty,
  name = "Doctor Pruebas",
} = {}) => {
  const suffix = uniqueSuffix();

  return User.create({
    name,
    email: `doctor.${suffix}@test.local`,
    password: "password123",
    role: "doctor",
    active,
    professionalLicense: `LIC-${suffix}`,
    phone: "3000000000",
    specialty,
  });
};

const createUser = async (role) => {
  const suffix = uniqueSuffix();

  return User.create({
    name: "Usuario Pruebas",
    email: `usuario.${suffix}@test.local`,
    password: "password123",
    role,
    active: true,
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

const listDoctors = async (user, query = {}) =>
  runChain([verifyToken, getDoctors], {
    headers: { authorization: `Bearer ${signToken(user)}` },
    query,
  });

test("recepcion obtiene el listado de odontólogos activos con especialidad poblada y sin password", async () => {
  const receptionist = await createUser("receptionist");

  const specialtyA = await createSpecialty();
  const specialtyB = await createSpecialty();

  const activeDoctor = await createDoctor({ specialty: specialtyA });
  await createDoctor({ specialty: specialtyB, active: false });

  const result = await listDoctors(receptionist);

  assert.equal(result.status, 200);
  assert.ok(Array.isArray(result.body));
  assert.equal(result.body.length, 1);

  const doctor = result.body[0];

  assert.equal(doctor._id.toString(), activeDoctor._id.toString());
  assert.equal(doctor.specialty?.name, specialtyA.name);
  assert.equal(doctor.active, true);

  assert.equal(
    doctor.password,
    undefined,
    "El listado no debe incluir la contraseña",
  );
});

test("paciente también puede consultar odontólogos (comportamiento actual)", async () => {
  const patient = await createUser("patient");

  const specialty = await createSpecialty();
  await createDoctor({ specialty });

  const result = await listDoctors(patient);

  assert.equal(result.status, 200);
  assert.ok(Array.isArray(result.body));
  assert.equal(result.body.length, 1);
});

test("filtro por especialidad devuelve solo los doctores de esa especialidad", async () => {
  const receptionist = await createUser("receptionist");

  const specialtyA = await createSpecialty();
  const specialtyB = await createSpecialty();

  await createDoctor({ specialty: specialtyA });
  await createDoctor({ specialty: specialtyB });
  await createDoctor({ specialty: specialtyB });

  const result = await listDoctors(receptionist, {
    specialty: String(specialtyB._id),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.length, 2);

  for (const doctor of result.body) {
    assert.equal(doctor.specialty._id.toString(), specialtyB._id.toString());
  }
});

test("un usuario sin doctores registrados obtiene un array vacío", async () => {
  const receptionist = await createUser("receptionist");

  const result = await listDoctors(receptionist);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, []);
});
