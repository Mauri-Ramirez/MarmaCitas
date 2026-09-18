import { test, before, after, beforeEach } from "node:test";

import assert from "node:assert/strict";

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import User from "../models/User.js";
import Specialty from "../models/Specialty.js";
import Schedule from "../models/Schedule.js";

import {
  createSchedule,
  deactivateSchedule,
} from "../controllers/scheduleController.js";

const TEST_DB_NAME = "marmacitas_test";

if (!process.env.MONGO_URI) {
  throw new Error(
    "MONGO_URI no está configurada. Los tests requieren un MongoDB con soporte de transacciones (replica set).",
  );
}

// Igual que en appointmentConcurrency.test.js: la opción
// dbName tiene prioridad sobre la base de datos del URI.
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

const createDoctor = async () => {
  const suffix = uniqueSuffix();

  const specialty = await Specialty.create({
    name: `Especialidad ${suffix}`,
  });

  return User.create({
    name: "Doctor Pruebas",
    email: `doctor.${suffix}@test.local`,
    password: "password123",
    role: "doctor",
    active: true,
    professionalLicense: `LIC-${suffix}`,
    phone: "3000000000",
    specialty: specialty._id,
  });
};

const callHandler = (handler, req) =>
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

    Promise.resolve(handler(req, res)).catch((error) =>
      resolve({ status: 500, body: null, thrown: error }),
    );
  });

const createScheduleReq = (doctorId, startTime, endTime, breakStart, breakEnd) => ({
  user: { id: String(doctorId), role: "admin" },
  body: {
    doctor: doctorId,
    startTime,
    endTime,
    ...(breakStart && breakEnd ? { breakStart, breakEnd } : {}),
  },
});

const deactivateReq = (scheduleId) => ({
  user: { id: String(scheduleId), role: "admin" },
  params: { id: scheduleId },
  body: {},
});

test("desactivar un horario permite crear un horario de reemplazo para el mismo doctor", async () => {
  const doctor = await createDoctor();

  const original = await Schedule.create({
    doctor: doctor._id,
    startTime: "08:00",
    endTime: "17:00",
    active: true,
  });

  const deactivated = await callHandler(
    deactivateSchedule,
    deactivateReq(String(original._id)),
  );

  assert.equal(deactivated.status, 200);

  const replacement = await callHandler(
    createSchedule,
    createScheduleReq(String(doctor._id), "09:00", "12:00"),
  );

  assert.equal(
    replacement.status,
    201,
    `El horario de reemplazo debe crearse tras el soft delete; se obtuvo ${replacement.status}: ${JSON.stringify(replacement.body)}`,
  );

  const activeCount = await Schedule.countDocuments({
    doctor: doctor._id,
    active: true,
  });

  assert.equal(activeCount, 1);

  const totalCount = await Schedule.countDocuments({
    doctor: doctor._id,
  });

  assert.equal(
    totalCount,
    2,
    "El histórico desactivado debe conservarse junto al reemplazo",
  );

  const activeSchedule = await Schedule.findOne({
    doctor: doctor._id,
    active: true,
  });

  assert.equal(activeSchedule.startTime, "09:00");
  assert.equal(activeSchedule.endTime, "12:00");

  const historicalSchedule = await Schedule.findById(original._id);

  assert.equal(historicalSchedule.active, false);
});

test("dos creaciones concurrentes de horario activo para el mismo doctor: una 201 y una 409", async () => {
  const doctor = await createDoctor();

  const [first, second] = await Promise.all([
    callHandler(
      createSchedule,
      createScheduleReq(String(doctor._id), "08:00", "17:00", "12:00", "14:00"),
    ),
    callHandler(
      createSchedule,
      createScheduleReq(String(doctor._id), "10:00", "16:00", "12:00", "14:00"),
    ),
  ]);

  const statuses = [first.status, second.status];

  assert.deepEqual(
    statuses.sort(),
    [201, 409],
    `El índice parcial debe rechazar el segundo horario activo; se obtuvieron ${first.status} y ${second.status}`,
  );

  const activeCount = await Schedule.countDocuments({
    doctor: doctor._id,
    active: true,
  });

  assert.equal(activeCount, 1);
});

test("múltiples horarios históricos inactivos pueden coexistir", async () => {
  const doctor = await createDoctor();

  const first = await Schedule.create({
    doctor: doctor._id,
    startTime: "08:00",
    endTime: "17:00",
    active: true,
  });

  const deactivateFirst = await callHandler(
    deactivateSchedule,
    deactivateReq(String(first._id)),
  );

  assert.equal(deactivateFirst.status, 200);

  const second = await Schedule.create({
    doctor: doctor._id,
    startTime: "10:00",
    endTime: "16:00",
    active: true,
  });

  const deactivateSecond = await callHandler(
    deactivateSchedule,
    deactivateReq(String(second._id)),
  );

  assert.equal(deactivateSecond.status, 200);

  const third = await Schedule.create({
    doctor: doctor._id,
    startTime: "07:00",
    endTime: "15:00",
    active: true,
  });

  assert.ok(third, "El tercer horario debe crearse con dos históricos previos");

  const inactiveCount = await Schedule.countDocuments({
    doctor: doctor._id,
    active: { $ne: true },
  });

  assert.equal(inactiveCount, 2);

  const activeCount = await Schedule.countDocuments({
    doctor: doctor._id,
    active: true,
  });

  assert.equal(activeCount, 1);

  const activeSchedule = await Schedule.findOne({
    doctor: doctor._id,
    active: true,
  });

  assert.equal(activeSchedule.startTime, "07:00");
  assert.equal(activeSchedule.endTime, "15:00");
});
