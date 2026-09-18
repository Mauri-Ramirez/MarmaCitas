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
import { getMyProfile } from "../controllers/userController.js";
import {
  getMyAppointments,
  getMyDoctorAppointments,
} from "../controllers/appointmentController.js";

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

const createUser = async ({ role = "patient", active = true } = {}) => {
  const suffix = uniqueSuffix();

  const data = {
    name: "Usuario Pruebas",
    email: `usuario.${suffix}@test.local`,
    password: "password123",
    role,
    active,
  };

  if (role === "doctor") {
    const specialty = await Specialty.create({
      name: `Especialidad ${suffix}`,
    });

    data.professionalLicense = `LIC-${suffix}`;
    data.phone = "3000000000";
    data.specialty = specialty._id;
  }

  return User.create(data);
};

const signToken = (user, roleOverride = null) =>
  jwt.sign(
    {
      id: user._id,
      role: roleOverride ?? user.role,
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

test("usuario activo accede a su perfil y al middleware deja el rol real de la BD en req.user", async () => {
  const user = await createUser({ role: "patient" });

  const req = {
    headers: { authorization: `Bearer ${signToken(user)}` },
  };

  const profile = await runChain(
    [verifyToken, getMyProfile],
    req,
  );

  assert.equal(profile.status, 200);
  assert.equal(profile.body.user._id.toString(), user._id.toString());

  assert.equal(req.user.id, user._id.toString());
  assert.equal(req.user.role, "patient");
});

test("usuario desactivado pierde acceso inmediatamente con su token vigente", async () => {
  const user = await createUser({ role: "patient" });

  const token = signToken(user);

  const before = await runChain([verifyToken, getMyProfile], {
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(before.status, 200);

  user.active = false;

  await user.save();

  const after = await runChain([verifyToken, getMyProfile], {
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(
    after.status,
    401,
    `Un usuario desactivado no debe conservar acceso; se obtuvo ${after.status}`,
  );

  assert.notEqual(before.body, null);
});

test("cambio de rol en BD aplica de inmediato al rol usado por el RBAC", async () => {
  const doctor = await createUser({ role: "doctor" });

  const token = signToken(doctor);

  const asDoctor = await runChain(
    [verifyToken, requireRole("doctor"), getMyDoctorAppointments],
    { headers: { authorization: `Bearer ${token}` } },
  );

  assert.equal(asDoctor.status, 200);

  doctor.role = "patient";

  await doctor.save();

  const demotedDoctorRoute = await runChain(
    [verifyToken, requireRole("doctor"), getMyDoctorAppointments],
    { headers: { authorization: `Bearer ${token}` } },
  );

  assert.equal(
    demotedDoctorRoute.status,
    403,
    `El rol vigente es patient; la ruta de doctor debe denegarse; se obtuvo ${demotedDoctorRoute.status}`,
  );

  const patientRoute = await runChain(
    [verifyToken, requireRole("patient"), getMyAppointments],
    { headers: { authorization: `Bearer ${token}` } },
  );

  assert.equal(
    patientRoute.status,
    200,
    `El rol vigente es patient; la ruta de paciente debe permitirse; se obtuvo ${patientRoute.status}`,
  );
});

test("un rol falsificado en el token no otorga permisos: manda el rol de la BD", async () => {
  const patient = await createUser({ role: "patient" });

  const forgedToken = signToken(patient, "admin");

  const result = await runChain(
    [verifyToken, requireRole("admin")],
    { headers: { authorization: `Bearer ${forgedToken}` } },
  );

  assert.equal(
    result.status,
    403,
    `El rol real es patient; el claim admin del token no debe dar acceso; se obtuvo ${result.status}`,
  );
});

test("usuario borrado tras emitir el token recibe 401", async () => {
  const user = await createUser({ role: "patient" });

  const token = signToken(user);

  await User.deleteOne({ _id: user._id });

  const result = await runChain([verifyToken], {
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(result.status, 401);
});

test("token malformado responde 403", async () => {
  const result = await runChain([verifyToken], {
    headers: { authorization: "Bearer esto-no-es-un-jwt" },
  });

  assert.equal(result.status, 403);
  assert.equal(result.body.message, "Token inválido");
});

test("request sin header de autorización responde 401", async () => {
  const result = await runChain([verifyToken], { headers: {} });

  assert.equal(result.status, 401);
});
