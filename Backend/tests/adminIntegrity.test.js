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
import requireRole from "../middlewares/roleMiddleware.js";
import { deactivateDoctor } from "../controllers/doctorController.js";
import { updateSchedule } from "../controllers/scheduleController.js";
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

const createUser = async (role) => {
  const suffix = uniqueSuffix();

  return User.create({
    name: "Usuario Pruebas",
    email: `usuario.${role}.${suffix}@test.local`,
    password: "password123",
    role,
    active: true,
  });
};

const createSchedule = async (
  doctor,
  { startTime, endTime, breakStart, breakEnd },
) =>
  Schedule.create({
    doctor: doctor._id,
    startTime,
    endTime,
    breakStart,
    breakEnd,
    active: true,
  });

const futureBusinessDateKey = () => {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + 2);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.toISOString().slice(0, 10);
};

const bogotaIso = (dateKey, time) => `${dateKey}T${time}:00-05:00`;

const createAppointment = async ({
  doctor,
  patient,
  service,
  status = "confirmed",
  time,
  duration,
}) =>
  Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    service: service._id,
    dateTime: new Date(bogotaIso(futureBusinessDateKey(), time)),
    status,
    paymentStatus: "pending",
    serviceSnapshot: {
      serviceId: service._id,
      name: service.name,
      duration: duration ?? service.duration,
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

const adminChain = (handler) => [verifyToken, requireRole("admin"), handler];

const deactivate = async (admin, doctorId) =>
  runChain(adminChain(deactivateDoctor), {
    headers: { authorization: `Bearer ${signToken(admin)}` },
    params: { id: String(doctorId) },
    body: {},
  });

const setActive = async (admin, userId, active) =>
  runChain(adminChain(setUserActive), {
    headers: { authorization: `Bearer ${signToken(admin)}` },
    params: { id: String(userId) },
    body: { active },
  });

const updateHours = async (
  admin,
  scheduleId,
  { startTime, endTime, breakStart, breakEnd },
) =>
  runChain(adminChain(updateSchedule), {
    headers: { authorization: `Bearer ${signToken(admin)}` },
    params: { id: String(scheduleId) },
    body: { startTime, endTime, breakStart, breakEnd },
  });

// =====================================================
// DESACTIVACIÓN DE ODONTÓLOGO
// =====================================================

test("desactivar doctor sin citas bloqueantes: 200", async () => {
  const { doctor } = await createWorld();
  const admin = await createUser("admin");

  const result = await deactivate(admin, doctor._id);

  assert.equal(result.status, 200);

  const saved = await User.findById(doctor._id);

  assert.equal(saved.active, false);
});

test("desactivar doctor con cita futura confirmed: 409", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createAppointment({ doctor, patient, service, status: "confirmed", time: "09:00" });

  const result = await deactivate(admin, doctor._id);

  assert.equal(result.status, 409);
  assert.match(result.body.message, /pendiente|futura/);

  const saved = await User.findById(doctor._id);

  assert.equal(saved.active, true);
});

test("desactivar doctor con cita in_progress: 409", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createAppointment({ doctor, patient, service, status: "in_progress", time: "09:00" });

  const result = await deactivate(admin, doctor._id);

  assert.equal(result.status, 409);

  const saved = await User.findById(doctor._id);

  assert.equal(saved.active, true);
});

test("desactivar doctor solo con cita confirmed pasada: 200", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    service: service._id,
    dateTime: new Date(Date.now() - 60 * 60 * 1000),
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
  });

  const result = await deactivate(admin, doctor._id);

  assert.equal(result.status, 200);

  const saved = await User.findById(doctor._id);

  assert.equal(saved.active, false);
});

test("desactivar doctor solo con citas terminales: 200", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  for (const status of ["completed", "cancelled", "no_show"]) {
    await createAppointment({ doctor, patient, service, status, time: "09:00" });
  }

  const result = await deactivate(admin, doctor._id);

  assert.equal(result.status, 200);

  const saved = await User.findById(doctor._id);

  assert.equal(saved.active, false);
});

test("PATCH /users/:id/active no puede desactivar doctor con cita futura: 409", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createAppointment({ doctor, patient, service, status: "confirmed", time: "09:00" });

  const result = await setActive(admin, doctor._id, false);

  assert.equal(result.status, 409);

  const saved = await User.findById(doctor._id);

  assert.equal(saved.active, true);
});

test("reactivación de un doctor sigue funcionando", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  // Sin citas bloqueantes: primero se desactiva y luego se reactiva.
  await deactivate(admin, doctor._id);

  const result = await setActive(admin, doctor._id, true);

  assert.equal(result.status, 200);

  const saved = await User.findById(doctor._id);

  assert.equal(saved.active, true);
});

test("el admin no puede cambiar su propio estado (self-guard): 400", async () => {
  const admin = await createUser("admin");

  const result = await setActive(admin, admin._id, false);

  assert.equal(result.status, 400);
});

// =====================================================
// MODIFICACIÓN DE HORARIO
// =====================================================

test("reducir endTime dejando una cita fuera: 409", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createSchedule(doctor, { startTime: "08:00", endTime: "17:00", breakStart: "12:00", breakEnd: "14:00" });
  await createAppointment({ doctor, patient, service, time: "16:30" });

  const schedule = await Schedule.findOne({ doctor: doctor._id });

  const result = await updateHours(admin, schedule._id, {
    startTime: "08:00",
    endTime: "16:00",
    breakStart: "12:00",
    breakEnd: "14:00",
  });

  assert.equal(result.status, 409);
  assert.match(result.body.message, /fuera de cobertura/);

  const saved = await Schedule.findById(schedule._id);

  assert.equal(saved.endTime, "17:00");
});

test("ampliar endTime sin dejar citas fuera: 200", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createSchedule(doctor, { startTime: "08:00", endTime: "15:00", breakStart: "12:00", breakEnd: "14:00" });
  await createAppointment({ doctor, patient, service, time: "14:30" });

  const schedule = await Schedule.findOne({ doctor: doctor._id });

  const result = await updateHours(admin, schedule._id, {
    startTime: "08:00",
    endTime: "16:00",
    breakStart: "12:00",
    breakEnd: "14:00",
  });

  assert.equal(result.status, 200);

  const saved = await Schedule.findById(schedule._id);

  assert.equal(saved.endTime, "16:00");
});

test("extender endTime más allá de la jornada clínica se rechaza por jornada: 400", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createSchedule(doctor, { startTime: "08:00", endTime: "17:00", breakStart: "12:00", breakEnd: "14:00" });
  await createAppointment({ doctor, patient, service, time: "16:30" });

  const schedule = await Schedule.findOne({ doctor: doctor._id });

  const result = await updateHours(admin, schedule._id, {
    startTime: "08:00",
    endTime: "17:30",
    breakStart: "12:00",
    breakEnd: "14:00",
  });

  assert.equal(result.status, 400);
  assert.match(result.body.message, /jornada de la clínica/);
});

test("retrasar startTime dejando una cita fuera: 409", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createSchedule(doctor, { startTime: "08:00", endTime: "17:00", breakStart: "12:00", breakEnd: "14:00" });
  await createAppointment({ doctor, patient, service, time: "08:30" });

  const schedule = await Schedule.findOne({ doctor: doctor._id });

  const result = await updateHours(admin, schedule._id, {
    startTime: "09:00",
    endTime: "17:00",
    breakStart: "12:00",
    breakEnd: "14:00",
  });

  assert.equal(result.status, 409);

  const saved = await Schedule.findById(schedule._id);

  assert.equal(saved.startTime, "08:00");
});

test("adelantar startTime sin afectar citas: 200", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createSchedule(doctor, { startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "14:00" });
  await createAppointment({ doctor, patient, service, time: "10:30" });

  const schedule = await Schedule.findOne({ doctor: doctor._id });

  const result = await updateHours(admin, schedule._id, {
    startTime: "08:00",
    endTime: "17:00",
    breakStart: "12:00",
    breakEnd: "14:00",
  });

  assert.equal(result.status, 200);

  const saved = await Schedule.findById(schedule._id);

  assert.equal(saved.startTime, "08:00");
});

test("una pausa nueva que invade una cita: 409", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createSchedule(doctor, { startTime: "08:00", endTime: "12:00" });
  await createAppointment({ doctor, patient, service, time: "09:00" });

  const schedule = await Schedule.findOne({ doctor: doctor._id });

  const result = await updateHours(admin, schedule._id, {
    startTime: "08:00",
    endTime: "12:00",
    breakStart: "09:00",
    breakEnd: "09:30",
  });

  assert.equal(result.status, 409);

  const saved = await Schedule.findById(schedule._id);

  assert.equal(saved.breakStart, undefined);
});

test("quitar una pausa sin dejar citas fuera: 200", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  await createSchedule(doctor, { startTime: "08:00", endTime: "12:00", breakStart: "09:00", breakEnd: "10:00" });
  await createAppointment({ doctor, patient, service, time: "10:30" });

  const schedule = await Schedule.findOne({ doctor: doctor._id });

  const result = await updateHours(admin, schedule._id, {
    startTime: "08:00",
    endTime: "12:00",
    breakStart: undefined,
    breakEnd: undefined,
  });

  assert.equal(result.status, 200);

  const saved = await Schedule.findById(schedule._id);

  assert.equal(saved.breakStart, undefined);
});

test("una cita legacy ya fuera de cobertura actual no bloquea la modificación: 200", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  // Cita futura a las 13:30 (fuera de la cobertura efectiva actual 08-12/14-17).
  await createSchedule(doctor, { startTime: "08:00", endTime: "17:00", breakStart: "12:00", breakEnd: "14:00" });
  await createAppointment({ doctor, patient, service, time: "13:30" });

  const schedule = await Schedule.findOne({ doctor: doctor._id });

  const result = await updateHours(admin, schedule._id, {
    startTime: "08:00",
    endTime: "16:00",
    breakStart: "12:00",
    breakEnd: "14:00",
  });

  assert.equal(result.status, 200);

  const saved = await Schedule.findById(schedule._id);

  assert.equal(saved.endTime, "16:00");
});

test("verifica la duración completa de la cita, no solo la hora de inicio", async () => {
  const { service, doctor } = await createWorld();
  const patient = await createUser("patient");
  const admin = await createUser("admin");

  // Cita de 60 minutos 16:00-17:00.
  await createSchedule(doctor, { startTime: "08:00", endTime: "17:00", breakStart: "12:00", breakEnd: "14:00" });
  await createAppointment({ doctor, patient, service, time: "16:00", duration: 60 });

  const schedule = await Schedule.findOne({ doctor: doctor._id });

  const result = await updateHours(admin, schedule._id, {
    startTime: "08:00",
    endTime: "16:30",
    breakStart: "12:00",
    breakEnd: "14:00",
  });

  assert.equal(result.status, 409);
});