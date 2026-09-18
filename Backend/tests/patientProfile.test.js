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
import {
  getMyProfile,
  updateMyProfile,
  getPatients,
  getPatientById,
  createPatient,
} from "../controllers/userController.js";

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

const createUser = async (role = "patient") => {
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

const createReceptionist = async () => createUser("receptionist");

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

const updateProfile = async (user, body) =>
  runChain([verifyToken, updateMyProfile], {
    headers: { authorization: `Bearer ${signToken(user)}` },
    body,
  });

const getMyUser = async (user) =>
  runChain([verifyToken, getMyProfile], {
    headers: { authorization: `Bearer ${signToken(user)}` },
  });

const listPatients = async (receptionist, query = {}) =>
  runChain(
    [
      verifyToken,
      requireRole("receptionist", "admin"),
      getPatients,
    ],
    {
      headers: { authorization: `Bearer ${signToken(receptionist)}` },
      query,
    },
  );

const getPatientDetail = async (receptionist, patientId) =>
  runChain(
    [
      verifyToken,
      requireRole("receptionist", "admin"),
      getPatientById,
    ],
    {
      headers: { authorization: `Bearer ${signToken(receptionist)}` },
      params: { id: patientId },
    },
  );

test("el paciente actualiza teléfono, alergias y observaciones médicas", async () => {
  const patient = await createUser("patient");

  const result = await updateProfile(patient, {
    name: "Paciente Actualizado",
    phone: "3112223344",
    allergies: "Penicilina",
    medicalNotes: "Alergia documentada en consulta previa.",
  });

  assert.equal(result.status, 200);

  const saved = await User.findById(patient._id);

  assert.equal(saved.name, "Paciente Actualizado");
  assert.equal(saved.phone, "3112223344");
  assert.equal(saved.allergies, "Penicilina");
  assert.equal(
    saved.medicalNotes,
    "Alergia documentada en consulta previa.",
  );

  const profile = await getMyUser(patient);

  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.phone, "3112223344");
  assert.equal(profile.body.user.allergies, "Penicilina");
  assert.equal(profile.body.user.medicalNotes, "Alergia documentada en consulta previa.");
});

test("el paciente puede limpiar los campos con cadenas vacías", async () => {
  const patient = await createUser("patient");

  await updateProfile(patient, {
    name: patient.name,
    phone: "3112223344",
    allergies: "Penicilina",
    medicalNotes: "Nota inicial.",
  });

  const cleared = await updateProfile(patient, {
    name: patient.name,
    phone: "",
    allergies: "",
    medicalNotes: "",
  });

  assert.equal(cleared.status, 200);

  const saved = await User.findById(patient._id);

  assert.equal(saved.phone, "");
  assert.equal(saved.allergies, "");
  assert.equal(saved.medicalNotes, "");
});

test("un doctor no puede actualizar teléfono, alergias ni observaciones: 400", async () => {
  const doctor = await createUser("doctor");

  const result = await updateProfile(doctor, {
    name: "Doctor Editado",
    allergies: "Intento inválido",
  });

  assert.equal(result.status, 400);

  const saved = await User.findById(doctor._id);

  assert.equal(saved.name, doctor.name, "El nombre no debe aplicarse");
  assert.equal(saved.allergies, "");
});

test("actualizar solo el nombre sigue funcionando para cualquier rol", async () => {
  const doctor = await createUser("doctor");

  const result = await updateProfile(doctor, { name: "Solo Nombre" });

  assert.equal(result.status, 200);

  const saved = await User.findById(doctor._id);

  assert.equal(saved.name, "Solo Nombre");
});

test("exceso de longitud en alergias responde 400", async () => {
  const patient = await createUser("patient");

  const result = await updateProfile(patient, {
    name: patient.name,
    allergies: "a".repeat(301),
  });

  assert.equal(result.status, 400);
});

test("recepción ve teléfono, alergias y observaciones en listado y detalle", async () => {
  const receptionist = await createReceptionist();
  const patient = await createUser("patient");

  await updateProfile(patient, {
    name: patient.name,
    phone: "3112223344",
    allergies: "Penicilina",
    medicalNotes: "Nota médica de prueba.",
  });

  const list = await listPatients(receptionist, { page: "1", limit: "10" });

  assert.equal(list.status, 200);

  const listed = list.body.patients.find(
    (item) => item._id.toString() === patient._id.toString(),
  );

  assert.ok(listed, "El paciente debe aparecer en el listado");
  assert.equal(listed.phone, "3112223344");
  assert.equal(listed.allergies, "Penicilina");
  assert.equal(listed.medicalNotes, "Nota médica de prueba.");

  const detail = await getPatientDetail(receptionist, patient._id);

  assert.equal(detail.status, 200);
  assert.equal(detail.body.patient.phone, "3112223344");
  assert.equal(detail.body.patient.allergies, "Penicilina");
  assert.equal(detail.body.patient.medicalNotes, "Nota médica de prueba.");
});

test("la búsqueda de pacientes incluye el teléfono", async () => {
  const receptionist = await createReceptionist();
  const patient = await createUser("patient");

  await updateProfile(patient, {
    name: patient.name,
    phone: "3119998877",
  });

  const byPhone = await listPatients(receptionist, {
    search: "3119998877",
    page: "1",
    limit: "10",
  });

  assert.equal(byPhone.status, 200);

  const listed = byPhone.body.patients.find(
    (item) => item._id.toString() === patient._id.toString(),
  );

  assert.ok(listed, "El paciente debe encontrarse por su teléfono");
  assert.equal(listed.phone, "3119998877");
});

test("crear paciente administrativo rechaza los campos médicos: allowlist intacta", async () => {
  const receptionist = await createReceptionist();

  const suffix = uniqueSuffix();

  const result = await runChain(
    [
      verifyToken,
      requireRole("receptionist", "admin"),
      createPatient,
    ],
    {
      headers: { authorization: `Bearer ${signToken(receptionist)}` },
      body: {
        name: "Paciente Recepción",
        email: `paciente.${suffix}@test.local`,
        allergies: "Intento inválido",
      },
    },
  );

  assert.equal(
    result.status,
    400,
    "La creación administrativa debe rechazar campos no permitidos",
  );
});
