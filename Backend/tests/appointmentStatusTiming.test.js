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
import { updateAppointmentStatus } from "../controllers/appointmentController.js";

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

const createPatient = async () => {
  const suffix = uniqueSuffix();

  return User.create({
    name: "Paciente Pruebas",
    email: `paciente.${suffix}@test.local`,
    password: "password123",
    role: "patient",
    active: true,
  });
};

// Creación directa (no vía createAppointment) para poder
// fijar dateTime arbitrarios: pasado, presente o futuro.
const createAppointment = async ({
  patient,
  doctor,
  service,
  dateTime,
  status = "confirmed",
}) =>
  Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    service: service._id,
    dateTime,
    status,
    paymentStatus: "pending",
    serviceSnapshot: {
      serviceId: service._id,
      name: service.name,
      duration: service.duration,
      price: service.price,
    },
    reason: "",
    createdBy: patient._id,
    lastStatusChangedBy: patient._id,
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

const changeStatus = async (doctor, appointmentId, status) =>
  runChain([verifyToken, updateAppointmentStatus], {
    headers: { authorization: `Bearer ${signToken(doctor)}` },
    params: { id: appointmentId },
    body: { status },
  });

test("in_progress sobre una cita futura responde 400 y el estado se conserva", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
  });

  const result = await changeStatus(doctor, appointment._id, "in_progress");

  assert.equal(result.status, 400);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");
});

test("no_show sobre una cita futura responde 400 y el estado se conserva", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
  });

  const result = await changeStatus(doctor, appointment._id, "no_show");

  assert.equal(result.status, 400);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");
});

test("dentro de la tolerancia de 15 minutos se permite in_progress", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 10 * 60 * 1000),
  });

  const result = await changeStatus(doctor, appointment._id, "in_progress");

  assert.equal(result.status, 200);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "in_progress");
});

test("cita ya iniciada permite in_progress y luego completed", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() - 60 * 60 * 1000),
  });

  const started = await changeStatus(doctor, appointment._id, "in_progress");

  assert.equal(started.status, 200);

  const completed = await changeStatus(doctor, appointment._id, "completed");

  assert.equal(completed.status, 200);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "completed");
});

test("completed directo desde confirmed sigue respondiendo 400", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() - 60 * 60 * 1000),
  });

  const result = await changeStatus(doctor, appointment._id, "completed");

  assert.equal(result.status, 400);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");
});

test("el odontólogo no puede cancelar una cita: 400 y el estado se conserva", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
  });

  const result = await changeStatus(doctor, appointment._id, "cancelled");

  assert.equal(result.status, 400);
  assert.equal(
    result.body.message,
    "El odontólogo no puede cancelar citas.",
  );

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");
});

test("recepción puede cancelar una cita futura aunque falten menos de 24 horas", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();

  const receptionist = await User.create({
    name: "Recepción Pruebas",
    email: `recepcion.${uniqueSuffix()}@test.local`,
    password: "password123",
    role: "receptionist",
    active: true,
  });

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
  });

  const result = await changeStatus(receptionist, appointment._id, "cancelled");

  assert.equal(result.status, 200);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "cancelled");
});

test("no_show permitido desde la hora de la cita en adelante", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createPatient();
  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() - 60 * 60 * 1000),
  });

  const result = await changeStatus(doctor, appointment._id, "no_show");

  assert.equal(result.status, 200);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "no_show");
});

test("un doctor ajeno no puede iniciar la atención de una cita ya iniciada: 403", async () => {
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
    dateTime: new Date(Date.now() - 60 * 60 * 1000),
  });

  const result = await changeStatus(
    otherDoctor,
    appointment._id,
    "in_progress",
  );

  assert.equal(result.status, 403);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");
});
