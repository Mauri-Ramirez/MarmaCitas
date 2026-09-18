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
import {
  getAppointmentAvailability,
  createAppointment,
} from "../controllers/appointmentController.js";
import {
  createSchedule,
  updateSchedule,
} from "../controllers/scheduleController.js";
import { CLINIC_HOURS_MESSAGE } from "../config/clinicSchedule.js";

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
    Appointment.deleteMany({}),
  ]);
});

let sequence = 0;

const uniqueSuffix = () =>
  `${Date.now()}_${++sequence}_${Math.floor(Math.random() * 1e6)}`;

const createWorld = async ({ serviceDuration = 30, withBreak = true } = {}) => {
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

  const patient = await User.create({
    name: "Paciente Pruebas",
    email: `paciente.${suffix}@test.local`,
    password: "password123",
    role: "patient",
    active: true,
  });

  const service = await Service.create({
    name: `Servicio ${suffix}`,
    description: "Servicio de pruebas",
    duration: serviceDuration,
    price: 50000,
    specialty: specialty._id,
  });

  const schedule = await Schedule.create({
    doctor: doctor._id,
    startTime: "08:00",
    endTime: "17:00",
    ...(withBreak ? { breakStart: "12:00", breakEnd: "14:00" } : {}),
    active: true,
  });

  return { specialty, doctor, patient, service, schedule };
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

const queryAvailability = async (patient, doctorId, serviceId, date) =>
  runChain(
    [
      verifyToken,
      requireRole("patient", "receptionist", "admin"),
      getAppointmentAvailability,
    ],
    {
      headers: { authorization: `Bearer ${signToken(patient)}` },
      query: {
        doctorId: String(doctorId),
        serviceId: String(serviceId),
        date,
      },
    },
  );

const futureBusinessDate = () => {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + 400);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const bogotaIso = (date, time) => `${date}T${time}:00-05:00`;

test("la disponibilidad omite la pausa 12:00-14:00 y conserva los tramos", async () => {
  const { patient, doctor, service } = await createWorld({
    serviceDuration: 30,
  });

  const result = await queryAvailability(
    patient,
    doctor._id,
    service._id,
    futureBusinessDate(),
  );

  assert.equal(result.status, 200);

  const slots = result.body.availableSlots;

  assert.ok(slots.includes("11:30"), "11:30 debe ofrecerse (último de la mañana)");
  assert.ok(slots.includes("14:00"), "14:00 debe ofrecerse (primer de la tarde)");
  assert.ok(slots.includes("16:30"), "16:30 debe ofrecerse (último de la tarde)");

  for (const forbidden of ["12:00", "12:15", "12:30", "13:00", "13:30", "13:45"]) {
    assert.ok(
      !slots.includes(forbidden),
      `el horario ${forbidden} no debe ofrecerse (dentro de la pausa)`,
    );
  }

  for (const slot of slots) {
    assert.ok(
      slot < "12:00" || slot >= "14:00",
      `el slot ${slot} cae dentro de la pausa`,
    );
  }
});

test("no se puede crear una cita dentro de la pausa (13:00)", async () => {
  const { patient, doctor, service } = await createWorld({
    serviceDuration: 30,
  });

  const result = await callHandler(createAppointment, {
    user: { id: String(patient._id), role: "patient" },
    body: {
      doctor: String(doctor._id),
      service: String(service._id),
      dateTime: bogotaIso(futureBusinessDate(), "13:00"),
    },
  });

  assert.equal(result.status, 400);
  assert.equal(
    result.body.message,
    "La cita se encuentra fuera del horario laboral del odontólogo.",
  );
});

test("se puede crear una cita en la mañana (11:00) y en la tarde (15:00)", async () => {
  const { patient, doctor, service } = await createWorld({
    serviceDuration: 30,
  });

  const date = futureBusinessDate();

  const morning = await callHandler(createAppointment, {
    user: { id: String(patient._id), role: "patient" },
    body: {
      doctor: String(doctor._id),
      service: String(service._id),
      dateTime: bogotaIso(date, "11:00"),
    },
  });

  assert.equal(morning.status, 201);

  const afternoon = await callHandler(createAppointment, {
    user: { id: String(patient._id), role: "patient" },
    body: {
      doctor: String(doctor._id),
      service: String(service._id),
      dateTime: bogotaIso(date, "15:00"),
    },
  });

  assert.equal(afternoon.status, 201);
});

const createDoctor = async () => {
  const suffix = uniqueSuffix();

  const specialty = await Specialty.create({
    name: `Especialidad ${suffix}`,
  });

  return User.create({
    name: "Doctor Sin Horario",
    email: `doctor.${suffix}@test.local`,
    password: "password123",
    role: "doctor",
    active: true,
    professionalLicense: `LIC-${suffix}`,
    phone: "3000000000",
    specialty: specialty._id,
  });
};

test("createSchedule rechaza una pausa fuera del horario o incompleta", async () => {
  const doctor = await createDoctor();

  const outOfRange = await callHandler(createSchedule, {
    body: {
      doctor: String(doctor._id),
      startTime: "08:00",
      endTime: "17:00",
      breakStart: "07:00",
      breakEnd: "09:00",
    },
  });

  assert.equal(outOfRange.status, 400);

  const incomplete = await callHandler(createSchedule, {
    body: {
      doctor: String(doctor._id),
      startTime: "08:00",
      endTime: "17:00",
      breakStart: "12:00",
    },
  });

  assert.equal(incomplete.status, 400);

  const invalidFormat = await callHandler(createSchedule, {
    body: {
      doctor: String(doctor._id),
      startTime: "08:00",
      endTime: "17:00",
      breakStart: "12:00",
      breakEnd: "2pm",
    },
  });

  assert.equal(invalidFormat.status, 400);
});

test("createSchedule y updateSchedule persisten una pausa válida", async () => {
  const doctor = await createDoctor();

  const created = await callHandler(createSchedule, {
    body: {
      doctor: String(doctor._id),
      startTime: "08:00",
      endTime: "17:00",
      breakStart: "12:00",
      breakEnd: "14:00",
    },
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.schedule.breakStart, "12:00");
  assert.equal(created.body.schedule.breakEnd, "14:00");

  const updated = await callHandler(updateSchedule, {
    params: { id: String(created.body.schedule._id) },
    body: {
      startTime: "08:00",
      endTime: "17:00",
      breakStart: "12:00",
      breakEnd: "14:30",
    },
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.schedule.breakStart, "12:00");
  assert.equal(updated.body.schedule.breakEnd, "14:30");
});

test("la disponibilidad respeta la jornada de la clínica aunque el horario no defina pausa", async () => {
  const { patient, doctor, service } = await createWorld({
    serviceDuration: 30,
    withBreak: false,
  });

  const result = await queryAvailability(
    patient,
    doctor._id,
    service._id,
    futureBusinessDate(),
  );

  assert.equal(result.status, 200);

  const slots = result.body.availableSlots;

  assert.ok(slots.includes("11:30"), "11:30 debe ofrecerse (último de la mañana)");
  assert.ok(slots.includes("14:00"), "14:00 debe ofrecerse (primer de la tarde)");
  assert.ok(slots.includes("16:30"), "16:30 debe ofrecerse (último de la tarde)");

  for (const forbidden of ["12:00", "12:15", "12:30", "13:00", "13:30", "13:45"]) {
    assert.ok(
      !slots.includes(forbidden),
      `el horario ${forbidden} no debe ofrecerse (dentro de la pausa de la clínica)`,
    );
  }
});

test("no se puede crear una cita dentro de la pausa aunque el horario no defina pausa", async () => {
  const { patient, doctor, service } = await createWorld({
    serviceDuration: 30,
    withBreak: false,
  });

  const date = futureBusinessDate();

  const rejected = await callHandler(createAppointment, {
    user: { id: String(patient._id), role: "patient" },
    body: {
      doctor: String(doctor._id),
      service: String(service._id),
      dateTime: bogotaIso(date, "13:00"),
    },
  });

  assert.equal(rejected.status, 400);
  assert.equal(
    rejected.body.message,
    "La cita se encuentra fuera del horario laboral del odontólogo.",
  );

  const morning = await callHandler(createAppointment, {
    user: { id: String(patient._id), role: "patient" },
    body: {
      doctor: String(doctor._id),
      service: String(service._id),
      dateTime: bogotaIso(date, "11:00"),
    },
  });

  assert.equal(morning.status, 201);
});

test("createSchedule rechaza horarios fuera de la jornada de la clínica", async () => {
  const doctor = await createDoctor();

  const cases = [
    { startTime: "07:00", endTime: "16:00" },
    { startTime: "08:00", endTime: "18:00" },
    { startTime: "08:00", endTime: "17:00" },
    {
      startTime: "08:00",
      endTime: "17:00",
      breakStart: "12:30",
      breakEnd: "14:30",
    },
  ];

  for (const body of cases) {
    const result = await callHandler(createSchedule, {
      body: {
        doctor: String(doctor._id),
        ...body,
      },
    });

    assert.equal(
      result.status,
      400,
      `El horario ${body.startTime}-${body.endTime} con pausa ${body.breakStart || "-"}-${body.breakEnd || "-"} debe rechazarse`,
    );
    assert.equal(result.body.message, CLINIC_HOURS_MESSAGE);
  }
});

test("createSchedule permite solo mañana, solo tarde y dos tramos dentro de la clínica", async () => {
  const validCases = [
    { startTime: "08:00", endTime: "12:00" },
    { startTime: "14:00", endTime: "17:00" },
    {
      startTime: "10:00",
      endTime: "15:00",
      breakStart: "12:00",
      breakEnd: "14:00",
    },
  ];

  for (const body of validCases) {
    const doctor = await createDoctor();

    const result = await callHandler(createSchedule, {
      body: {
        doctor: String(doctor._id),
        ...body,
      },
    });

    assert.equal(
      result.status,
      201,
      `El horario ${body.startTime}-${body.endTime} con pausa ${body.breakStart || "-"}-${body.breakEnd || "-"} debe aceptarse; se obtuvo ${result.status}: ${JSON.stringify(result.body)}`,
    );
  }
});

test("updateSchedule rechaza horarios fuera de la jornada de la clínica", async () => {
  const doctor = await createDoctor();

  const created = await callHandler(createSchedule, {
    body: {
      doctor: String(doctor._id),
      startTime: "08:00",
      endTime: "12:00",
    },
  });

  assert.equal(created.status, 201);

  const updated = await callHandler(updateSchedule, {
    params: { id: String(created.body.schedule._id) },
    body: {
      startTime: "08:00",
      endTime: "18:00",
    },
  });

  assert.equal(updated.status, 400);
  assert.equal(updated.body.message, CLINIC_HOURS_MESSAGE);
});

test("createAppointment persiste el motivo de consulta (reason)", async () => {
  const { patient, doctor, service } = await createWorld({
    serviceDuration: 30,
  });

  const result = await callHandler(createAppointment, {
    user: { id: String(patient._id), role: "patient" },
    body: {
      doctor: String(doctor._id),
      service: String(service._id),
      dateTime: bogotaIso(futureBusinessDate(), "11:00"),
      reason: "Dolor de muela desde hace dos días.",
    },
  });

  assert.equal(result.status, 201);

  const saved = await Appointment.findOne({
    _id: result.body.appointment._id,
  });

  assert.equal(saved.reason, "Dolor de muela desde hace dos días.");
  assert.equal(saved.clinicalNotes, "");
});

test("createAppointment acepta el campo legacy notes y lo mapea a reason", async () => {
  const { patient, doctor, service } = await createWorld({
    serviceDuration: 30,
  });

  const result = await callHandler(createAppointment, {
    user: { id: String(patient._id), role: "patient" },
    body: {
      doctor: String(doctor._id),
      service: String(service._id),
      dateTime: bogotaIso(futureBusinessDate(), "11:00"),
      notes: "Motivo escrito con el campo antiguo.",
    },
  });

  assert.equal(result.status, 201);

  const saved = await Appointment.findOne({
    _id: result.body.appointment._id,
  });

  assert.equal(saved.reason, "Motivo escrito con el campo antiguo.");
  assert.equal(saved.clinicalNotes, "");
});