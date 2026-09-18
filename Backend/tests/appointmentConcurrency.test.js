import { test, before, after, beforeEach } from "node:test";

import assert from "node:assert/strict";

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import User from "../models/User.js";
import Specialty from "../models/Specialty.js";
import Service from "../models/Service.js";
import Schedule from "../models/Schedule.js";
import Appointment from "../models/Appointment.js";

import {
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointmentStatus,
} from "../controllers/appointmentController.js";

const TEST_DB_NAME = "marmacitas_test";

if (!process.env.MONGO_URI) {
  throw new Error(
    "MONGO_URI no está configurada. Los tests requieren un MongoDB con soporte de transacciones (replica set).",
  );
}

// La opción dbName tiene prioridad sobre cualquier base de
// datos incluida en el URI del MONGO_URI, de modo que los
// tests siempre se ejecutan contra la base dedicada de
// pruebas sin depender del formato del URI.
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

const createWorld = async ({
  duration = 30,
  startTime = "08:00",
  endTime = "17:00",
} = {}) => {
  const suffix = uniqueSuffix();

  const specialty = await Specialty.create({
    name: `Especialidad ${suffix}`,
    description: "Especialidad de pruebas",
  });

  const service = await Service.create({
    name: `Servicio ${suffix}`,
    description: "Servicio de pruebas",
    duration,
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

  await Schedule.create({
    doctor: doctor._id,
    startTime,
    endTime,
    active: true,
  });

  const patient = await User.create({
    name: "Paciente Pruebas",
    email: `paciente.${suffix}@test.local`,
    password: "password123",
    role: "patient",
    active: true,
  });

  return { specialty, service, doctor, patient };
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

const bogotaIso = (date, time) => `${date}T${time}:00-05:00`;

const patientActor = (patient) => ({
  id: String(patient._id),
  role: "patient",
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

const createReq = ({ actor, patientId, doctorId, serviceId, dateTime }) => ({
  user: actor,
  body: {
    ...(patientId ? { patientId } : {}),
    doctor: doctorId,
    service: serviceId,
    dateTime,
  },
});

const assertNoActiveOverlaps = async () => {
  const appointments = await Appointment.find({
    status: { $in: ["confirmed", "in_progress"] },
  }).select("doctor patient dateTime serviceSnapshot");

  const endOf = (appointment) =>
    new Date(
      appointment.dateTime.getTime() +
        appointment.serviceSnapshot.duration * 60 * 1000,
    );

  for (let i = 0; i < appointments.length; i++) {
    for (let j = i + 1; j < appointments.length; j++) {
      const a = appointments[i];
      const b = appointments[j];

      const sharedDoctor = a.doctor.toString() === b.doctor.toString();
      const sharedPatient = a.patient.toString() === b.patient.toString();

      if (!sharedDoctor && !sharedPatient) {
        continue;
      }

      const overlaps = a.dateTime < endOf(b) && endOf(a) > b.dateTime;

      assert.ok(
        !overlaps,
        "Invariante violado: existen citas activas solapadas",
      );
    }
  }
};

test("dos creates concurrentes para el mismo doctor y hora: solo una se confirma", async () => {
  const world = await createWorld({ duration: 30 });
  const other = await createWorld({ duration: 30 });

  const date = futureBusinessDate();
  const dateTime = bogotaIso(date, "10:00");

  const doctorId = String(world.doctor._id);
  const serviceId = String(world.service._id);

  const [first, second] = await Promise.all([
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(world.patient),
        doctorId,
        serviceId,
        dateTime,
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(other.patient),
        doctorId,
        serviceId,
        dateTime,
      }),
    ),
  ]);

  assert.deepEqual(
    [first.status, second.status].sort(),
    [201, 409],
    `Se esperaban respuestas 201 y 409; se obtuvieron ${first.status} y ${second.status}`,
  );

  const activeCount = await Appointment.countDocuments({
    doctor: world.doctor._id,
    status: "confirmed",
  });

  assert.equal(activeCount, 1);

  const response =
    first.status === 201
      ? first.body.appointment
      : second.body.appointment;

  assert.ok(response, "La respuesta exitosa debe incluir la cita");

  assert.equal(
    response.doctor.appointmentLockVersion,
    undefined,
    "appointmentLockVersion no debe exponerse en el doctor poblado",
  );

  assert.equal(
    response.patient.appointmentLockVersion,
    undefined,
    "appointmentLockVersion no debe exponerse en el paciente poblado",
  );

  await assertNoActiveOverlaps();
});

test("dos creates concurrentes para el mismo paciente: solo una se confirma", async () => {
  const worldA = await createWorld({ duration: 30 });
  const worldB = await createWorld({ duration: 30 });

  const date = futureBusinessDate();
  const dateTime = bogotaIso(date, "10:00");

  const actor = patientActor(worldA.patient);

  const [first, second] = await Promise.all([
    callHandler(
      createAppointment,
      createReq({
        actor,
        doctorId: String(worldA.doctor._id),
        serviceId: String(worldA.service._id),
        dateTime,
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor,
        doctorId: String(worldB.doctor._id),
        serviceId: String(worldB.service._id),
        dateTime,
      }),
    ),
  ]);

  assert.deepEqual(
    [first.status, second.status].sort(),
    [201, 409],
    `Se esperaban respuestas 201 y 409; se obtuvieron ${first.status} y ${second.status}`,
  );

  const activeCount = await Appointment.countDocuments({
    patient: worldA.patient._id,
    status: "confirmed",
  });

  assert.equal(activeCount, 1);

  await assertNoActiveOverlaps();
});

test("mismo doctor con pacientes distintos en horas no solapadas: ambas se confirman", async () => {
  const world = await createWorld({ duration: 30 });
  const other = await createWorld({ duration: 30 });

  const date = futureBusinessDate();

  const doctorId = String(world.doctor._id);
  const serviceId = String(world.service._id);

  const [first, second] = await Promise.all([
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(world.patient),
        doctorId,
        serviceId,
        dateTime: bogotaIso(date, "10:00"),
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(other.patient),
        doctorId,
        serviceId,
        dateTime: bogotaIso(date, "11:00"),
      }),
    ),
  ]);

  assert.deepEqual([first.status, second.status], [201, 201]);

  await assertNoActiveOverlaps();
});

test("mismo paciente con doctores distintos en horas no solapadas: ambas se confirman", async () => {
  const worldA = await createWorld({ duration: 30 });
  const worldB = await createWorld({ duration: 30 });

  const date = futureBusinessDate();
  const actor = patientActor(worldA.patient);

  const [first, second] = await Promise.all([
    callHandler(
      createAppointment,
      createReq({
        actor,
        doctorId: String(worldA.doctor._id),
        serviceId: String(worldA.service._id),
        dateTime: bogotaIso(date, "10:00"),
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor,
        doctorId: String(worldB.doctor._id),
        serviceId: String(worldB.service._id),
        dateTime: bogotaIso(date, "11:00"),
      }),
    ),
  ]);

  assert.deepEqual([first.status, second.status], [201, 201]);

  await assertNoActiveOverlaps();
});

test("intervalos con horas distintas pero solapados: solo uno se confirma", async () => {
  const world = await createWorld({ duration: 60 });
  const other = await createWorld({ duration: 30 });

  const longService = await Service.create({
    name: `Servicio largo ${uniqueSuffix()}`,
    description: "Servicio de 45 minutos",
    duration: 45,
    price: 40000,
    specialty: world.specialty._id,
  });

  const date = futureBusinessDate();
  const doctorId = String(world.doctor._id);

  const [first, second] = await Promise.all([
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(world.patient),
        doctorId,
        serviceId: String(world.service._id),
        dateTime: bogotaIso(date, "10:00"),
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(other.patient),
        doctorId,
        serviceId: String(longService._id),
        dateTime: bogotaIso(date, "10:30"),
      }),
    ),
  ]);

  assert.deepEqual(
    [first.status, second.status].sort(),
    [201, 409],
    "10:00-11:00 contra 10:30-11:15 se solapan: solo una cita puede confirmarse",
  );

  await assertNoActiveOverlaps();
});

test("intervalos adyacentes: ambas citas se confirman", async () => {
  const world = await createWorld({ duration: 30 });
  const other = await createWorld({ duration: 30 });

  const date = futureBusinessDate();
  const doctorId = String(world.doctor._id);
  const serviceId = String(world.service._id);

  const [first, second] = await Promise.all([
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(world.patient),
        doctorId,
        serviceId,
        dateTime: bogotaIso(date, "10:00"),
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(other.patient),
        doctorId,
        serviceId,
        dateTime: bogotaIso(date, "10:30"),
      }),
    ),
  ]);

  assert.deepEqual(
    [first.status, second.status],
    [201, 201],
    "10:00-10:30 y 10:30-11:00 son adyacentes y válidas",
  );

  await assertNoActiveOverlaps();
});

test("create concurrente contra reschedule al mismo intervalo: solo uno ocupa el espacio", async () => {
  const world = await createWorld({ duration: 30 });
  const other = await createWorld({ duration: 30 });

  const date = futureBusinessDate();
  const doctorId = String(world.doctor._id);
  const serviceId = String(world.service._id);

  const initial = await callHandler(
    createAppointment,
    createReq({
      actor: patientActor(world.patient),
      doctorId,
      serviceId,
      dateTime: bogotaIso(date, "09:00"),
    }),
  );

  assert.equal(initial.status, 201);

  const appointmentId = initial.body.appointment._id;

  const [createResult, rescheduleResult] = await Promise.all([
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(other.patient),
        doctorId,
        serviceId,
        dateTime: bogotaIso(date, "10:00"),
      }),
    ),
    callHandler(rescheduleAppointment, {
      user: patientActor(world.patient),
      params: { id: appointmentId },
      body: { dateTime: bogotaIso(date, "10:00") },
    }),
  ]);

  const successCount = [createResult.status, rescheduleResult.status].filter(
    (status) => status === 201 || status === 200,
  ).length;

  assert.equal(
    successCount,
    1,
    `Solo una operación puede ocupar las 10:00; se obtuvieron ${createResult.status} y ${rescheduleResult.status}`,
  );

  assert.ok(
    createResult.status === 409 || rescheduleResult.status === 409,
    "La operación perdedora debe recibir 409",
  );

  const appointmentsAtTarget = await Appointment.countDocuments({
    doctor: world.doctor._id,
    status: "confirmed",
    dateTime: new Date(bogotaIso(date, "10:00")),
  });

  assert.equal(appointmentsAtTarget, 1);

  await assertNoActiveOverlaps();
});

test("dos reschedules concurrentes de la misma cita: solo uno se confirma", async () => {
  const world = await createWorld({ duration: 30 });

  const date = futureBusinessDate();
  const doctorId = String(world.doctor._id);
  const serviceId = String(world.service._id);
  const actor = patientActor(world.patient);

  const initial = await callHandler(
    createAppointment,
    createReq({
      actor,
      doctorId,
      serviceId,
      dateTime: bogotaIso(date, "09:00"),
    }),
  );

  assert.equal(initial.status, 201);

  const appointmentId = initial.body.appointment._id;

  const [first, second] = await Promise.all([
    callHandler(rescheduleAppointment, {
      user: actor,
      params: { id: appointmentId },
      body: { dateTime: bogotaIso(date, "10:00") },
    }),
    callHandler(rescheduleAppointment, {
      user: actor,
      params: { id: appointmentId },
      body: { dateTime: bogotaIso(date, "10:15") },
    }),
  ]);

  assert.deepEqual(
    [first.status, second.status].sort(),
    [200, 409],
    `Solo un reschedule puede confirmarse; se obtuvieron ${first.status} y ${second.status}`,
  );

  const finalAppointment = await Appointment.findById(appointmentId);

  const finalIso = finalAppointment.dateTime.toISOString();
  const expectedFirst = new Date(bogotaIso(date, "10:00")).toISOString();
  const expectedSecond = new Date(bogotaIso(date, "10:15")).toISOString();

  assert.ok(
    finalIso === expectedFirst || finalIso === expectedSecond,
    `La fecha final debe ser uno de los dos destinos; se obtuvo ${finalIso}`,
  );

  await assertNoActiveOverlaps();
});

test("cancel concurrente con reschedule: solo una operación se aplica", async () => {
  const world = await createWorld({ duration: 30 });

  const date = futureBusinessDate();
  const doctorId = String(world.doctor._id);
  const serviceId = String(world.service._id);
  const actor = patientActor(world.patient);

  const initial = await callHandler(
    createAppointment,
    createReq({
      actor,
      doctorId,
      serviceId,
      dateTime: bogotaIso(date, "09:00"),
    }),
  );

  assert.equal(initial.status, 201);

  const appointmentId = initial.body.appointment._id;

  const [cancelResult, rescheduleResult] = await Promise.all([
    callHandler(cancelAppointment, {
      user: actor,
      params: { id: appointmentId },
      body: {},
    }),
    callHandler(rescheduleAppointment, {
      user: actor,
      params: { id: appointmentId },
      body: { dateTime: bogotaIso(date, "11:00") },
    }),
  ]);

  const successCount = [cancelResult.status, rescheduleResult.status].filter(
    (status) => status === 200,
  ).length;

  assert.equal(
    successCount,
    1,
    `Solo cancelar o reprogramar puede aplicarse; se obtuvieron ${cancelResult.status} y ${rescheduleResult.status}`,
  );

  assert.ok(
    [cancelResult.status, rescheduleResult.status].every((status) =>
      [200, 400, 409].includes(status),
    ),
    `Las respuestas deben ser 200/400/409; se obtuvieron ${cancelResult.status} y ${rescheduleResult.status}`,
  );

  const finalAppointment = await Appointment.findById(appointmentId);

  const isCancelledWithOriginalDate =
    finalAppointment.status === "cancelled" &&
    finalAppointment.dateTime.toISOString() ===
      new Date(bogotaIso(date, "09:00")).toISOString();

  const isRescheduled =
    finalAppointment.status === "confirmed" &&
    finalAppointment.dateTime.toISOString() ===
      new Date(bogotaIso(date, "11:00")).toISOString();

  assert.ok(
    isCancelledWithOriginalDate || isRescheduled,
    "El estado final debe corresponder exactamente a la operación ganadora",
  );

  await assertNoActiveOverlaps();
});

test("dos cambios de estado concurrentes sobre la misma cita: solo uno se aplica", async () => {
  const world = await createWorld({ duration: 30 });

  const date = futureBusinessDate();
  const doctorId = String(world.doctor._id);
  const serviceId = String(world.service._id);

  const initial = await callHandler(
    createAppointment,
    createReq({
      actor: patientActor(world.patient),
      doctorId,
      serviceId,
      dateTime: bogotaIso(date, "09:00"),
    }),
  );

  assert.equal(initial.status, 201);

  const appointmentId = initial.body.appointment._id;

  // La guarda temporal exige que la cita ya haya iniciado
  // (con tolerancia de 15 minutos). El fixture mueve su
  // dateTime al pasado reciente para poder transicionarla,
  // porque createAppointment solo acepta fechas futuras.
  await Appointment.findByIdAndUpdate(appointmentId, {
    dateTime: new Date(Date.now() - 60 * 60 * 1000),
  });

  const doctorActor = {
    id: String(world.doctor._id),
    role: "doctor",
  };

  const [first, second] = await Promise.all([
    callHandler(updateAppointmentStatus, {
      user: doctorActor,
      params: { id: appointmentId },
      body: { status: "in_progress" },
    }),
    callHandler(updateAppointmentStatus, {
      user: doctorActor,
      params: { id: appointmentId },
      body: { status: "in_progress" },
    }),
  ]);

  const statuses = [first.status, second.status];

  assert.equal(
    statuses.filter((status) => status === 200).length,
    1,
    `Exactamente un cambio de estado debe confirmarse; se obtuvieron ${first.status} y ${second.status}`,
  );

  assert.ok(
    statuses.every((status) => [200, 400, 409].includes(status)),
    `Las respuestas deben ser 200/400/409; se obtuvieron ${first.status} y ${second.status}`,
  );

  const finalAppointment = await Appointment.findById(appointmentId);

  assert.equal(finalAppointment.status, "in_progress");

  await assertNoActiveOverlaps();
});

test("carga mixta concurrente: nunca quedan citas activas solapadas", async () => {
  const worldA = await createWorld({ duration: 30 });
  const worldB = await createWorld({ duration: 45 });
  const worldC = await createWorld({ duration: 30 });

  const date = futureBusinessDate();

  const operations = [
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(worldA.patient),
        doctorId: String(worldA.doctor._id),
        serviceId: String(worldA.service._id),
        dateTime: bogotaIso(date, "10:00"),
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(worldB.patient),
        doctorId: String(worldA.doctor._id),
        serviceId: String(worldA.service._id),
        dateTime: bogotaIso(date, "10:15"),
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(worldC.patient),
        doctorId: String(worldB.doctor._id),
        serviceId: String(worldB.service._id),
        dateTime: bogotaIso(date, "10:00"),
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(worldA.patient),
        doctorId: String(worldB.doctor._id),
        serviceId: String(worldB.service._id),
        dateTime: bogotaIso(date, "10:30"),
      }),
    ),
    callHandler(
      createAppointment,
      createReq({
        actor: patientActor(worldC.patient),
        doctorId: String(worldC.doctor._id),
        serviceId: String(worldC.service._id),
        dateTime: bogotaIso(date, "16:00"),
      }),
    ),
  ];

  const results = await Promise.all(operations);

  for (const result of results) {
    assert.ok(
      [201, 409].includes(result.status),
      `Toda creación debe terminar en 201 o 409; se obtuvo ${result.status}`,
    );
  }

  const createdCount = results.filter((r) => r.status === 201).length;

  assert.ok(createdCount >= 2, "Al menos dos citas deben confirmarse");

  await assertNoActiveOverlaps();
});
