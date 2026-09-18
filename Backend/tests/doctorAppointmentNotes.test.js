import { test, before, after, beforeEach } from "node:test";

import assert from "node:assert/strict";

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Specialty from "../models/Specialty.js";
import Service from "../models/Service.js";
import Appointment from "../models/Appointment.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import {
  updateAppointmentNotes,
  getMyDoctorAppointments,
  getMyAppointments,
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

  await Promise.all([
    User.init(),
    Specialty.init(),
    Service.init(),
    Appointment.init(),
  ]);
});

after(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Specialty.deleteMany({}),
    Service.deleteMany({}),
    Appointment.deleteMany({}),
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

  const service = await Service.create({
    name: `Servicio ${suffix}`,
    description: "Servicio de pruebas",
    duration: 30,
    price: 50000,
    specialty: specialty._id,
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

  return { specialty, service, doctor };
};

const createPatient = async ({
  phone = "3112223344",
  allergies = "Penicilina",
  medicalNotes = "Alergia documentada en consulta previa.",
} = {}) => {
  const suffix = uniqueSuffix();

  return User.create({
    name: "Paciente Pruebas",
    email: `paciente.${suffix}@test.local`,
    password: "password123",
    role: "patient",
    active: true,
    phone,
    allergies,
    medicalNotes,
  });
};

const futureDate = () => {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + 400);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
};

const createAppointment = async ({
  patient,
  doctor,
  service,
  status = "in_progress",
}) =>
  Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    service: service._id,
    dateTime: futureDate(),
    status,
    paymentStatus: "pending",
    serviceSnapshot: {
      serviceId: service._id,
      name: service.name,
      duration: service.duration,
      price: service.price,
    },
    reason: "",
    createdBy: doctor._id,
    lastStatusChangedBy: doctor._id,
  });

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

const updateNotes = async (doctor, appointmentId, clinicalNotes) =>
  runChain([verifyToken, updateAppointmentNotes], {
    headers: { authorization: `Bearer ${signToken(doctor)}` },
    params: { id: appointmentId },
    body: { clinicalNotes },
  });

test("el odontólogo actualiza la nota clínica de su propia cita: 200 y persiste", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
  });

  const result = await updateNotes(
    doctor,
    appointment._id,
    "Limpieza realizada sin complicaciones.",
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.appointment.clinicalNotes, "Limpieza realizada sin complicaciones.");

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.clinicalNotes, "Limpieza realizada sin complicaciones.");
});

test("la respuesta incluye los datos clínicos del paciente", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
  });

  const result = await updateNotes(doctor, appointment._id, "Notas de prueba.");

  assert.equal(result.status, 200);
  assert.equal(result.body.appointment.patient.phone, "3112223344");
  assert.equal(result.body.appointment.patient.allergies, "Penicilina");
  assert.equal(
    result.body.appointment.patient.medicalNotes,
    "Alergia documentada en consulta previa.",
  );
});

test("getMyDoctorAppointments expone teléfono, alergias y observaciones del paciente", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  await createAppointment({ patient, doctor, service });

  const result = await runChain(
    [verifyToken, getMyDoctorAppointments],
    {
      headers: { authorization: `Bearer ${signToken(doctor)}` },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.length, 1);
  assert.equal(result.body[0].patient.phone, "3112223344");
  assert.equal(result.body[0].patient.allergies, "Penicilina");
  assert.equal(
    result.body[0].patient.medicalNotes,
    "Alergia documentada en consulta previa.",
  );
});

test("el odontólogo no puede actualizar notas de la cita de otro doctor: 403", async () => {
  const { specialty, service, doctor } = await createWorld();

  const otherDoctor = await User.create({
    name: "Doctor Ajeno",
    email: `ajeno.${uniqueSuffix()}@test.local`,
    password: "password123",
    role: "doctor",
    active: true,
    professionalLicense: `LIC-${uniqueSuffix()}`,
    phone: "3000000001",
    specialty: specialty._id,
  });

  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
  });

  const result = await updateNotes(
    otherDoctor,
    appointment._id,
    "Intento inválido.",
  );

  assert.equal(result.status, 403);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.clinicalNotes, "", "Las notas no deben haber cambiado");
});

test("notas con más de 2000 caracteres responden 400", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
  });

  const result = await updateNotes(doctor, appointment._id, "a".repeat(2001));

  assert.equal(result.status, 400);
});

test("notas ausentes o de tipo inválido responden 400", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
  });

  const missing = await updateNotes(doctor, appointment._id, undefined);

  assert.equal(missing.status, 400);

  const invalid = await updateNotes(doctor, appointment._id, 12345);

  assert.equal(invalid.status, 400);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.clinicalNotes, "");
});

test("cita inexistente responde 404", async () => {
  const { doctor } = await createWorld();

  const result = await updateNotes(
    doctor,
    new mongoose.Types.ObjectId(),
    "Notas cualquiera.",
  );

  assert.equal(result.status, 404);
});

test("un rol distinto de doctor no accede al endpoint: requireRole responde 403", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
  });

  const result = await runChain(
    [
      verifyToken,
      requireRole("doctor"),
      updateAppointmentNotes,
    ],
    {
      headers: { authorization: `Bearer ${signToken(patient)}` },
      params: { id: appointment._id },
      body: { clinicalNotes: "Intento de paciente." },
    },
  );

  assert.equal(result.status, 403);
});

test("guardar notas vacías permite limpiar el campo", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
  });

  await updateNotes(doctor, appointment._id, "Nota temporal.");

  const cleared = await updateNotes(doctor, appointment._id, "");

  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.appointment.clinicalNotes, "");

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.clinicalNotes, "");
});

test("el payload del paciente excluye clinicalNotes y attachments", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();

  const appointment = await Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    service: service._id,
    dateTime: futureDate(),
    status: "completed",
    paymentStatus: "pending",
    serviceSnapshot: {
      serviceId: service._id,
      name: service.name,
      duration: service.duration,
      price: service.price,
    },
    reason: "Dolor dental.",
    clinicalNotes: "Nota clínica sensible.",
    attachments: [
      {
        filename: "radio.pdf",
        storedName: "generado.pdf",
        mimeType: "application/pdf",
        size: 10,
        uploadedBy: doctor._id,
      },
    ],
    createdBy: doctor._id,
    lastStatusChangedBy: doctor._id,
  });

  const result = await runChain([verifyToken, getMyAppointments], {
    headers: { authorization: `Bearer ${signToken(patient)}` },
  });

  assert.equal(result.status, 200);

  const payload = result.body[0];

  const serialized = JSON.parse(JSON.stringify(payload));

  assert.equal(serialized.reason, "Dolor dental.");
  assert.ok(
    !("clinicalNotes" in serialized),
    "clinicalNotes no debe estar en el payload del paciente",
  );
  assert.ok(
    !("attachments" in serialized),
    "attachments no debe estar en el payload del paciente",
  );

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.clinicalNotes, "Nota clínica sensible.");
});

for (const status of ["confirmed", "completed", "cancelled", "no_show"]) {
  test(`no se pueden modificar notas clínicas en una cita ${status}`, async () => {
    const { service, doctor } = await createWorld();
    const patient = await createPatient();
    const appointment = await createAppointment({
      patient,
      doctor,
      service,
      status,
    });

    const result = await updateNotes(
      doctor,
      appointment._id,
      "Intento en estado no permitido.",
    );

    assert.equal(result.status, 400);
    assert.match(result.body.message, /en atención/);

    const saved = await Appointment.findById(appointment._id);

    assert.equal(saved.clinicalNotes, "");
  });
}
