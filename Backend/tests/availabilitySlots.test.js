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
import { getAppointmentAvailability } from "../controllers/appointmentController.js";

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

const createWorld = async ({ serviceDuration = 45 } = {}) => {
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
    endTime: "12:00",
    active: true,
  });

  return { specialty, doctor, patient, service, schedule };
};

const createOccupiedService = async (specialty, duration) => {
  const suffix = uniqueSuffix();

  return Service.create({
    name: `Ocupado ${suffix}`,
    description: "Servicio ocupado de pruebas",
    duration,
    price: 40000,
    specialty: specialty._id,
  });
};

const createOccupiedAppointment = async ({
  doctor,
  patient,
  service,
  snapshotDuration,
  date,
  time,
}) =>
  Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    service: service._id,
    dateTime: new Date(`${date}T${time}:00-05:00`),
    status: "confirmed",
    paymentStatus: "pending",
    serviceSnapshot: {
      serviceId: service._id,
      name: service.name,
      duration: snapshotDuration,
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

const pastBusinessDate = () => {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() - 1);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const nextSaturdayDate = () => {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + 400);

  while (date.getUTCDay() !== 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getBogotaTodayKey = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (type) => parts.find((part) => part.type === type).value;

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

test("caso reportado: cita de 30 min que termina 10:00 y servicio de 45 min ofrece 10:00", async () => {
  const { doctor, patient, specialty, service } = await createWorld({
    serviceDuration: 45,
  });

  const occupiedService = await createOccupiedService(specialty, 30);

  const date = futureBusinessDate();

  await createOccupiedAppointment({
    doctor,
    patient,
    service: occupiedService,
    snapshotDuration: 30,
    date,
    time: "09:30",
  });

  const result = await queryAvailability(
    patient,
    doctor._id,
    service._id,
    date,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.availableSlots, [
    "08:00",
    "08:15",
    "08:30",
    "08:45",
    "10:00",
    "10:15",
    "10:30",
    "10:45",
    "11:00",
    "11:15",
  ]);
});

test("la cadencia de inicios no depende de la duración del servicio", async () => {
  const { doctor, patient, specialty, service } = await createWorld({
    serviceDuration: 30,
  });

  const service45 = await Service.create({
    name: `Servicio 45 ${uniqueSuffix()}`,
    description: "Servicio de 45 minutos",
    duration: 45,
    price: 60000,
    specialty: specialty._id,
  });

  const service60 = await Service.create({
    name: `Servicio 60 ${uniqueSuffix()}`,
    description: "Servicio de 60 minutos",
    duration: 60,
    price: 70000,
    specialty: specialty._id,
  });

  const date = futureBusinessDate();

  const for30 = await queryAvailability(
    patient,
    doctor._id,
    service._id,
    date,
  );
  const for45 = await queryAvailability(
    patient,
    doctor._id,
    service45._id,
    date,
  );
  const for60 = await queryAvailability(
    patient,
    doctor._id,
    service60._id,
    date,
  );

  assert.equal(for30.status, 200);
  assert.equal(for45.status, 200);
  assert.equal(for60.status, 200);

  for (const response of [for30, for45, for60]) {
    assert.equal(response.body.availableSlots[0], "08:00");
    assert.ok(
      response.body.availableSlots.includes("10:00"),
      `10:00 debe ofrecerse para servicio de ${response.body.service.duration} min`,
    );
  }

  assert.equal(
    for30.body.availableSlots[for30.body.availableSlots.length - 1],
    "11:30",
  );
  assert.equal(
    for45.body.availableSlots[for45.body.availableSlots.length - 1],
    "11:15",
  );
  assert.equal(
    for60.body.availableSlots[for60.body.availableSlots.length - 1],
    "11:00",
  );
});

test("una cita ocupada larga bloquea por solapamiento y libera por adyacencia", async () => {
  const { doctor, patient, specialty, service } = await createWorld({
    serviceDuration: 45,
  });

  const occupiedService = await createOccupiedService(specialty, 60);

  const date = futureBusinessDate();

  await createOccupiedAppointment({
    doctor,
    patient,
    service: occupiedService,
    snapshotDuration: 60,
    date,
    time: "10:00",
  });

  const result = await queryAvailability(
    patient,
    doctor._id,
    service._id,
    date,
  );

  assert.equal(result.status, 200);

  const slots = result.body.availableSlots;

  assert.ok(!slots.includes("09:30"), "09:30 solapa 10:00-11:00");
  assert.ok(!slots.includes("10:45"), "10:45 solapa 10:00-11:00");
  assert.ok(slots.includes("09:00"), "09:00-09:45 termina antes de 10:00 y es libre");
  assert.ok(slots.includes("09:15"), "09:15-10:00 es adyacente y válida");
  assert.ok(slots.includes("11:00"), "11:00 es adyacente y válida");
  assert.deepEqual(slots, [
    "08:00",
    "08:15",
    "08:30",
    "08:45",
    "09:00",
    "09:15",
    "11:00",
    "11:15",
  ]);
});

test("fin de semana responde 200 con arreglo vacío", async () => {
  const { doctor, patient, service } = await createWorld({
    serviceDuration: 45,
  });

  const result = await queryAvailability(
    patient,
    doctor._id,
    service._id,
    nextSaturdayDate(),
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.availableSlots, []);
});

test("una fecha pasada responde 200 con arreglo vacío", async () => {
  const { doctor, patient, service } = await createWorld({
    serviceDuration: 45,
  });

  const result = await queryAvailability(
    patient,
    doctor._id,
    service._id,
    pastBusinessDate(),
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.availableSlots, []);
});

test("para el día en curso ningún slot ofrecido está en el pasado", async () => {
  const { doctor, patient, service } = await createWorld({
    serviceDuration: 45,
  });

  const date = getBogotaTodayKey();

  const result = await queryAvailability(
    patient,
    doctor._id,
    service._id,
    date,
  );

  assert.equal(result.status, 200);

  const now = new Date();

  for (const slot of result.body.availableSlots) {
    const slotDateTime = new Date(`${date}T${slot}:00-05:00`);

    assert.ok(
      slotDateTime > now,
      `El slot ${slot} del día en curso no debe estar en el pasado`,
    );
  }
});
