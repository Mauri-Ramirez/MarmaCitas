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
import { getAppointments } from "../controllers/appointmentController.js";

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
  name = "Paciente Pruebas",
  role = "patient",
} = {}) => {
  const suffix = uniqueSuffix();

  return User.create({
    name,
    email: `paciente.${suffix}@test.local`,
    password: "password123",
    role,
    active: true,
  });
};

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

const nextBusinessDate = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + 1);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const bogotaIso = (date, time) => `${date}T${time}:00-05:00`;

const createAppointment = async ({
  patient,
  doctor,
  service,
  date,
  time = "10:00",
  status = "confirmed",
}) =>
  Appointment.create({
    patient,
    doctor,
    service,
    dateTime: new Date(bogotaIso(date, time)),
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

const listAppointments = async (user, query = {}) =>
  runChain(
    [verifyToken, requireRole("admin", "receptionist"), getAppointments],
    {
      headers: { authorization: `Bearer ${signToken(user)}` },
      query,
    },
  );

const createReceptionist = async () => {
  const suffix = uniqueSuffix();

  return User.create({
    name: "Recepcion Pruebas",
    email: `recepcion.${suffix}@test.local`,
    password: "password123",
    role: "receptionist",
    active: true,
  });
};

test("recepcion obtiene el listado con paginación y orden por fecha", async () => {
  const receptionist = await createReceptionist();

  const world = await createWorld();
  const patient = await createPatient();

  const firstDate = futureBusinessDate();
  const secondDate = nextBusinessDate(firstDate);

  await createAppointment({
    patient,
    doctor: world.doctor,
    service: world.service,
    date: firstDate,
    time: "10:00",
  });

  await createAppointment({
    patient,
    doctor: world.doctor,
    service: world.service,
    date: firstDate,
    time: "11:00",
  });

  await createAppointment({
    patient,
    doctor: world.doctor,
    service: world.service,
    date: secondDate,
    time: "10:00",
  });

  const result = await listAppointments(receptionist, {
    page: "1",
    limit: "2",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.appointments.length, 2);
  assert.equal(result.body.pagination.total, 3);
  assert.equal(result.body.pagination.pages, 2);
  assert.equal(result.body.pagination.page, 1);

  const times = result.body.appointments.map(
    (appointment) => appointment.dateTime,
  );

  assert.deepEqual(
    [...times].sort((a, b) => new Date(a) - new Date(b)),
    times,
    "El listado debe estar ordenado por fecha ascendente",
  );

  assert.ok(result.body.appointments[0].patient?.name);
  assert.ok(result.body.appointments[0].doctor?.name);
  assert.ok(result.body.appointments[0].serviceSnapshot?.name);
});

test("paciente no puede listar citas: 403", async () => {
  const patient = await createPatient();

  const result = await listAppointments(patient, {});

  assert.equal(result.status, 403);
});

test("filtro date devuelve solo las citas de ese día", async () => {
  const receptionist = await createReceptionist();

  const world = await createWorld();
  const patient = await createPatient();

  const firstDate = futureBusinessDate();
  const secondDate = nextBusinessDate(firstDate);

  await createAppointment({
    patient,
    doctor: world.doctor,
    service: world.service,
    date: firstDate,
    time: "09:00",
  });

  await createAppointment({
    patient,
    doctor: world.doctor,
    service: world.service,
    date: firstDate,
    time: "14:00",
  });

  await createAppointment({
    patient,
    doctor: world.doctor,
    service: world.service,
    date: secondDate,
    time: "09:00",
  });

  const result = await listAppointments(receptionist, {
    date: firstDate,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.pagination.total, 2);

  for (const appointment of result.body.appointments) {
    const bogotaHour = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(appointment.dateTime);

    assert.ok(
      ["09:00", "14:00"].includes(bogotaHour),
      `La cita debe pertenecer al día filtrado; hora Bogotá: ${bogotaHour}`,
    );
  }
});

test("filtro status devuelve solo las citas con ese estado", async () => {
  const receptionist = await createReceptionist();

  const world = await createWorld();
  const patient = await createPatient();

  const date = futureBusinessDate();

  await createAppointment({
    patient,
    doctor: world.doctor,
    service: world.service,
    date,
    time: "09:00",
    status: "confirmed",
  });

  await createAppointment({
    patient,
    doctor: world.doctor,
    service: world.service,
    date,
    time: "10:00",
    status: "cancelled",
  });

  const result = await listAppointments(receptionist, {
    status: "cancelled",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.pagination.total, 1);
  assert.equal(result.body.appointments[0].status, "cancelled");
});

test("search filtra por nombre y correo del paciente", async () => {
  const receptionist = await createReceptionist();

  const world = await createWorld();

  const maria = await createPatient({ name: "Maria Lopez" });
  const other = await createPatient({ name: "Carlos Perez" });

  const date = futureBusinessDate();

  await createAppointment({
    patient: maria,
    doctor: world.doctor,
    service: world.service,
    date,
    time: "09:00",
  });

  await createAppointment({
    patient: other,
    doctor: world.doctor,
    service: world.service,
    date,
    time: "10:00",
  });

  const byName = await listAppointments(receptionist, {
    search: "Maria",
  });

  assert.equal(byName.status, 200);
  assert.equal(byName.body.pagination.total, 1);
  assert.equal(byName.body.appointments[0].patient.name, "Maria Lopez");

  const byEmail = await listAppointments(receptionist, {
    search: maria.email.split("@")[0],
  });

  assert.equal(byEmail.status, 200);
  assert.equal(byEmail.body.pagination.total, 1);
  assert.equal(byEmail.body.appointments[0].patient.name, "Maria Lopez");
});

test("parámetro desconocido responde 400", async () => {
  const receptionist = await createReceptionist();

  const result = await listAppointments(receptionist, {
    unknownParam: "valor",
  });

  assert.equal(result.status, 400);
});

test("limit mayor a 50 responde 400", async () => {
  const receptionist = await createReceptionist();

  const result = await listAppointments(receptionist, {
    page: "1",
    limit: "51",
  });

  assert.equal(result.status, 400);
});
