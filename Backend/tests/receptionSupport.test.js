import { test, before, after, beforeEach } from "node:test";

import assert from "node:assert/strict";

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Specialty from "../models/Specialty.js";
import Schedule from "../models/Schedule.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import { getScheduleByDoctor } from "../controllers/scheduleController.js";
import { updatePatient } from "../controllers/userController.js";

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

  await Promise.all([User.init(), Specialty.init(), Schedule.init()]);
});

after(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Specialty.deleteMany({}),
    Schedule.deleteMany({}),
  ]);
});

let sequence = 0;

const uniqueSuffix = () =>
  `${Date.now()}_${++sequence}_${Math.floor(Math.random() * 1e6)}`;

const createWorld = async () => {
  const suffix = uniqueSuffix();

  const specialty = await Specialty.create({
    name: `Especialidad ${suffix}`,
  });

  const doctor = await User.create({
    name: "Doctor Pruebas",
    email: `doctor.${suffix}@test.local`,
    password: "password123",
    role: "doctor",
    active: true,
    professionalLicense: `LIC-${suffix}`,
    phone: "3000000000",
    specialty: specialty._id,
  });

  return { specialty, doctor };
};

const createUser = async (role = "patient", extra = {}) => {
  const suffix = uniqueSuffix();

  return User.create({
    name: "Usuario Pruebas",
    email: `usuario.${suffix}@test.local`,
    password: "password123",
    role,
    active: true,
    ...extra,
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

const getDoctorScheduleAs = (user, doctorId) =>
  runChain(
    [
      verifyToken,
      requireRole("receptionist", "admin"),
      getScheduleByDoctor,
    ],
    {
      headers: { authorization: `Bearer ${signToken(user)}` },
      params: { doctorId },
    },
  );

const updatePatientAs = (user, patientId, body) =>
  runChain(
    [
      verifyToken,
      requireRole("receptionist", "admin"),
      updatePatient,
    ],
    {
      headers: { authorization: `Bearer ${signToken(user)}` },
      params: { id: patientId },
      body,
    },
  );

// =====================================================
// GET /api/schedules/doctor/:doctorId
// =====================================================

test("recepción consulta el horario activo de un odontólogo: 200", async () => {
  const { doctor } = await createWorld();
  const receptionist = await createUser("receptionist");

  await Schedule.create({
    doctor: doctor._id,
    startTime: "08:00",
    endTime: "12:00",
    active: true,
  });

  const result = await getDoctorScheduleAs(receptionist, doctor._id);

  assert.equal(result.status, 200);
  assert.equal(result.body.startTime, "08:00");
  assert.equal(result.body.endTime, "12:00");
  assert.equal(String(result.body.doctor._id), String(doctor._id));
});

test("odontólogo sin horario activo responde 404", async () => {
  const { doctor } = await createWorld();
  const receptionist = await createUser("receptionist");

  const result = await getDoctorScheduleAs(receptionist, doctor._id);

  assert.equal(result.status, 404);
});

test("identificador que no corresponde a un doctor responde 404", async () => {
  const patient = await createUser("patient");
  const receptionist = await createUser("receptionist");

  const result = await getDoctorScheduleAs(receptionist, patient._id);

  assert.equal(result.status, 404);
});

test("identificador de odontólogo inválido responde 400", async () => {
  const receptionist = await createUser("receptionist");

  const result = await getDoctorScheduleAs(receptionist, "no-es-un-id");

  assert.equal(result.status, 400);
});

test("un rol sin permisos no consulta horarios: requireRole responde 403", async () => {
  const { doctor } = await createWorld();
  const patient = await createUser("patient");

  const result = await getDoctorScheduleAs(patient, doctor._id);

  assert.equal(result.status, 403);
});

// =====================================================
// PUT /api/users/patients/:id
// =====================================================

test("recepción actualiza nombre, teléfono, alergias y observaciones: 200 y persiste", async () => {
  const receptionist = await createUser("receptionist");
  const patient = await createUser("patient");

  const result = await updatePatientAs(receptionist, patient._id, {
    name: "Paciente Editado",
    phone: "3112223344",
    allergies: "Penicilina",
    medicalNotes: "Alergia documentada en consulta previa.",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.patient.name, "Paciente Editado");
  assert.equal(result.body.patient.phone, "3112223344");
  assert.equal(result.body.patient.allergies, "Penicilina");
  assert.equal(
    result.body.patient.medicalNotes,
    "Alergia documentada en consulta previa.",
  );

  const saved = await User.findById(patient._id);

  assert.equal(saved.name, "Paciente Editado");
  assert.equal(saved.phone, "3112223344");
  assert.equal(saved.allergies, "Penicilina");
  assert.equal(
    saved.medicalNotes,
    "Alergia documentada en consulta previa.",
  );
});

test("actualización parcial: solo el teléfono solicitado cambia", async () => {
  const receptionist = await createUser("receptionist");
  const patient = await createUser("patient", {
    name: "Paciente Parcial",
    allergies: "Penicilina",
  });

  const result = await updatePatientAs(receptionist, patient._id, {
    phone: "3115556666",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.patient.phone, "3115556666");
  assert.equal(result.body.patient.name, "Paciente Parcial");
  assert.equal(result.body.patient.allergies, "Penicilina");
});

test("solicitud sin campos responde 400", async () => {
  const receptionist = await createUser("receptionist");
  const patient = await createUser("patient");

  const result = await updatePatientAs(receptionist, patient._id, {});

  assert.equal(result.status, 400);
});

test("campos no permitidos responden 400", async () => {
  const receptionist = await createUser("receptionist");
  const patient = await createUser("patient");

  const result = await updatePatientAs(receptionist, patient._id, {
    email: "nuevo@test.local",
  });

  assert.equal(result.status, 400);
});

test("exceso de longitud en alergias responde 400", async () => {
  const receptionist = await createUser("receptionist");
  const patient = await createUser("patient");

  const result = await updatePatientAs(receptionist, patient._id, {
    allergies: "a".repeat(301),
  });

  assert.equal(result.status, 400);
});

test("campo de tipo inválido responde 400", async () => {
  const receptionist = await createUser("receptionist");
  const patient = await createUser("patient");

  const result = await updatePatientAs(receptionist, patient._id, {
    phone: 12345,
  });

  assert.equal(result.status, 400);
});

test("nombre vacío responde 400", async () => {
  const receptionist = await createUser("receptionist");
  const patient = await createUser("patient");

  const result = await updatePatientAs(receptionist, patient._id, {
    name: "   ",
  });

  assert.equal(result.status, 400);
});

test("identificador inválido responde 400", async () => {
  const receptionist = await createUser("receptionist");

  const result = await updatePatientAs(receptionist, "no-es-un-id", {
    name: "Nombre Válido",
  });

  assert.equal(result.status, 400);
});

test("paciente inexistente responde 404", async () => {
  const receptionist = await createUser("receptionist");

  const result = await updatePatientAs(
    receptionist,
    new mongoose.Types.ObjectId(),
    { name: "Nombre Válido" },
  );

  assert.equal(result.status, 404);
});

test("un identificador que no es paciente responde 404", async () => {
  const receptionist = await createUser("receptionist");
  const otherReceptionist = await createUser("receptionist");

  const result = await updatePatientAs(receptionist, otherReceptionist._id, {
    name: "Intento Inválido",
  });

  assert.equal(result.status, 404);
});

test("un rol sin permisos no edita pacientes: requireRole responde 403", async () => {
  const patient = await createUser("patient");

  const result = await updatePatientAs(patient, patient._id, {
    name: "Intento de paciente",
  });

  assert.equal(result.status, 403);
});
