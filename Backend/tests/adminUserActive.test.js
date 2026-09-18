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
import { setUserActive } from "../controllers/userController.js";

const TEST_DB_NAME = "marmacitas_test";

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI no está configurada.");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET no está configurada.");
}

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

const createUser = async (role) => {
  const suffix = uniqueSuffix();

  const data = {
    name: "Usuario Pruebas",
    email: `usuario.${suffix}@test.local`,
    password: "password123",
    role,
    active: true,
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

const setActive = async (actor, userId, active) =>
  runChain(
    [verifyToken, requireRole("admin"), setUserActive],
    {
      headers: { authorization: `Bearer ${signToken(actor)}` },
      params: { id: String(userId) },
      body: { active },
    },
  );

test("el admin desactiva y reactiva a un paciente", async () => {
  const admin = await createUser("admin");
  const patient = await createUser("patient");

  const deactivated = await setActive(admin, patient._id, false);

  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.user.active, false);

  const savedAfterDeactivate = await User.findById(patient._id);

  assert.equal(savedAfterDeactivate.active, false);

  const reactivated = await setActive(admin, patient._id, true);

  assert.equal(reactivated.status, 200);
  assert.equal(reactivated.body.user.active, true);
});

test("el admin puede desactivar/reactivar a un doctor", async () => {
  const admin = await createUser("admin");
  const doctor = await createUser("doctor");

  const deactivated = await setActive(admin, doctor._id, false);

  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.user.active, false);
});

test("un admin no puede cambiar su propio estado de actividad", async () => {
  const admin = await createUser("admin");

  const result = await setActive(admin, admin._id, false);

  assert.equal(result.status, 400);
  assert.equal(
    result.body.message,
    "No puedes cambiar tu propio estado de actividad.",
  );

  const saved = await User.findById(admin._id);

  assert.equal(saved.active, true);
});

test("un rol distinto de admin no accede al endpoint: 403", async () => {
  const receptionist = await createUser("receptionist");
  const patient = await createUser("patient");

  const result = await runChain(
    [verifyToken, requireRole("admin"), setUserActive],
    {
      headers: {
        authorization: `Bearer ${signToken(receptionist)}`,
      },
      params: { id: String(patient._id) },
      body: { active: false },
    },
  );

  assert.equal(result.status, 403);
});

test("un usuario inexistente responde 404", async () => {
  const admin = await createUser("admin");

  const result = await setActive(admin, new mongoose.Types.ObjectId(), false);

  assert.equal(result.status, 404);
});

test("active no booleano responde 400", async () => {
  const admin = await createUser("admin");
  const patient = await createUser("patient");

  const result = await runChain(
    [verifyToken, requireRole("admin"), setUserActive],
    {
      headers: { authorization: `Bearer ${signToken(admin)}` },
      params: { id: String(patient._id) },
      body: { active: "yes" },
    },
  );

  assert.equal(result.status, 400);
});