import { test, before, after, beforeEach } from "node:test";

import assert from "node:assert/strict";

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Specialty from "../models/Specialty.js";
import Service from "../models/Service.js";
import Schedule from "../models/Schedule.js";
import Appointment from "../models/Appointment.js";

import verifyToken from "../middlewares/authMiddleware.js";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "../controllers/appointmentController.js";

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

  await Promise.all([
    User.init(),
    Specialty.init(),
    Service.init(),
    Schedule.init(),
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
    Schedule.deleteMany({}),
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

const createUser = async (role, extra = {}) => {
  const suffix = uniqueSuffix();

  return User.create({
    name: "Usuario Pruebas",
    email: `usuario.${role}.${suffix}@test.local`,
    password: "password123",
    role,
    active: true,
    ...extra,
  });
};

const createAppointment = async ({ patient, doctor, service, dateTime }) =>
  Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    service: service._id,
    dateTime,
    status: "confirmed",
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

const cancelAs = async (actor, appointmentId) =>
  runChain([verifyToken, cancelAppointment], {
    headers: { authorization: `Bearer ${signToken(actor)}` },
    params: { id: String(appointmentId) },
    body: {},
  });

const rescheduleAs = async (actor, appointmentId, dateTime) =>
  runChain([verifyToken, rescheduleAppointment], {
    headers: { authorization: `Bearer ${signToken(actor)}` },
    params: { id: String(appointmentId) },
    body: { dateTime: new Date(dateTime).toISOString() },
  });

// Fecha laboral futura (al menos 2 días adelante).
const futureBusinessDate = () => {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + 2);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
};

const createSchedule = async (doctor) =>
  Schedule.create({
    doctor: doctor._id,
    startTime: "08:00",
    endTime: "12:00",
    active: true,
  });

// =====================================================
// CANCELACIÓN
// =====================================================

test("el paciente cancela con al menos 24 horas: permitido", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
  });

  const result = await cancelAs(patient, appointment._id);

  assert.equal(result.status, 200);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "cancelled");
});

test("el paciente cancela con menos de 24 horas: rechazado", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });

  const result = await cancelAs(patient, appointment._id);

  assert.equal(result.status, 400);
  assert.match(result.body.message, /24 horas/);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");
});

test("el paciente no puede eludir la regla de 24 horas reprogramando primero", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });

  const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const reschedule = await rescheduleAs(patient, appointment._id, futureDate);

  assert.equal(reschedule.status, 400);
  assert.match(reschedule.body.message, /24 horas/);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");
});

test("la recepción puede cancelar con menos de 24 horas", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const receptionist = await createUser("receptionist");

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });

  const result = await cancelAs(receptionist, appointment._id);

  assert.equal(result.status, 200);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "cancelled");
});

test("el admin puede cancelar con menos de 24 horas", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });

  const result = await cancelAs(admin, appointment._id);

  assert.equal(result.status, 200);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "cancelled");
});

// =====================================================
// REPROGRAMACIÓN
// =====================================================

test("una cita pasada confirmada no puede reprogramarse", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() - 60 * 60 * 1000),
  });

  const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const result = await rescheduleAs(patient, appointment._id, futureDate);

  assert.equal(result.status, 400);
  assert.match(result.body.message, /ya pasó/);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");
});

test("el paciente no puede reprogramar una cita a menos de 24 horas de la original", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });

  const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const result = await rescheduleAs(patient, appointment._id, futureDate);

  assert.equal(result.status, 400);
  assert.match(result.body.message, /24 horas/);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");
});

test("recepción y admin pueden reprogramar citas con menos de 24 horas de anticipación", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const receptionist = await createUser("receptionist");

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });

  const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const result = await rescheduleAs(receptionist, appointment._id, futureDate);

  assert.equal(result.status, 400);
  assert.match(result.body.message, /no tiene un horario laboral activo/);
});

test("una cita futura confirmada con horario válido puede reprogramarse", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");

  await createSchedule(doctor);

  const businessDay = futureBusinessDate();

  const businessDayKey = businessDay.toISOString().slice(0, 10);

  const appointment = await createAppointment({
    patient,
    doctor,
    service,
    dateTime: new Date(`${businessDayKey}T09:00:00-05:00`),
  });

  const newDateTime = new Date(`${businessDayKey}T09:30:00-05:00`);

  const result = await rescheduleAs(patient, appointment._id, newDateTime);

  assert.equal(result.status, 200);

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.status, "confirmed");

  assert.equal(saved.dateTime.toISOString(), newDateTime.toISOString());
});