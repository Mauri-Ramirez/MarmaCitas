/**
 * =====================================================
 * Seed puntual para la demo de MarmaCitas.
 * -----------------------------------------------------
 * Crea en la base de datos definida en MONGO_URI
 * (marmacitas) un conjunto mínimo de usuarios y
 * catálogos, de forma idempotente:
 *
 * - 1 administrador
 * - 1 recepcionista
 * - 1 odontólogo (con especialidad, servicio y horario)
 *
 * Si un registro ya existe, se omite y se informa.
 * No borra ni modifica datos existentes.
 *
 * Uso:  npm run seed:demo   (desde Backend)
 * =====================================================
 */

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Specialty from "../models/Specialty.js";
import Service from "../models/Service.js";
import Schedule from "../models/Schedule.js";

const DEMO_ADMIN = {
  name: "Administrador Demo",
  email: "admin@marma.com",
  password: "AdminDemo2026!",
};

const DEMO_RECEPTIONIST = {
  name: "Recepción Demo",
  email: "recepcion@marma.com",
  password: "RecepcionDemo2026!",
};

const DEMO_DOCTOR = {
  name: "Doctor Demo",
  email: "doctor@marma.com",
  password: "DoctorDemo2026!",
  professionalLicense: "LIC-DEMO-001",
  phone: "3001112233",
};

const DEMO_SPECIALTY = {
  name: "Odontología General",
  description: "Valoración y procedimientos generales.",
};

const DEMO_SERVICE = {
  name: "Valoración odontológica",
  description: "Consulta de valoración inicial.",
  duration: 30,
  price: 50000,
};

const DEMO_SCHEDULE = {
  startTime: "08:00",
  endTime: "17:00",
  breakStart: "12:00",
  breakEnd: "14:00",
};

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI no está configurada.");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
  });
};

const upsertUser = async ({ name, email, password, extra = {} }) => {
  const existing = await User.findOne({ email });

  if (existing) {
    return { user: existing, created: false };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: extra.role,
    ...extra,
  });

  return { user, created: true };
};

const seed = async () => {
  await connectDB();

  const summary = [];

  // =================================================
  // Administrador
  // =================================================

  const adminResult = await upsertUser({
    ...DEMO_ADMIN,
    extra: { role: "admin" },
  });

  summary.push(
    `admin@marma.com: ${adminResult.created ? "creado" : "ya existía"}`,
  );

  // =================================================
  // Recepcionista
  // =================================================

  const receptionistResult = await upsertUser({
    ...DEMO_RECEPTIONIST,
    extra: { role: "receptionist" },
  });

  summary.push(
    `recepcion@marma.com: ${receptionistResult.created ? "creado" : "ya existía"}`,
  );

  // =================================================
  // Especialidad
  // =================================================

  let specialty = await Specialty.findOne({
    name: DEMO_SPECIALTY.name,
  });

  if (specialty) {
    summary.push(`especialidad "${DEMO_SPECIALTY.name}": ya existía`);
  } else {
    specialty = await Specialty.create(DEMO_SPECIALTY);
    summary.push(`especialidad "${DEMO_SPECIALTY.name}": creada`);
  }

  // =================================================
  // Odontólogo (requiere la especialidad)
  // =================================================

  const doctorResult = await upsertUser({
    ...DEMO_DOCTOR,
    extra: {
      role: "doctor",
      professionalLicense: DEMO_DOCTOR.professionalLicense,
      phone: DEMO_DOCTOR.phone,
      specialty: specialty._id,
    },
  });

  summary.push(
    `doctor@marma.com: ${doctorResult.created ? "creado" : "ya existía"}`,
  );

  const doctor = doctorResult.user;

  // =================================================
  // Servicio (requiere la especialidad)
  // =================================================

  let service = await Service.findOne({
    name: DEMO_SERVICE.name,
    specialty: specialty._id,
    active: true,
  });

  if (service) {
    summary.push(`servicio "${DEMO_SERVICE.name}": ya existía`);
  } else {
    service = await Service.create({
      ...DEMO_SERVICE,
      specialty: specialty._id,
    });
    summary.push(`servicio "${DEMO_SERVICE.name}": creado`);
  }

  // =================================================
  // Horario del odontólogo
  // =================================================

  const schedule = await Schedule.findOne({
    doctor: doctor._id,
    active: true,
  });

  if (schedule) {
    const hadBreak = schedule.breakStart && schedule.breakEnd;

    if (!hadBreak) {
      schedule.breakStart = DEMO_SCHEDULE.breakStart;
      schedule.breakEnd = DEMO_SCHEDULE.breakEnd;

      await schedule.save();
    }

    summary.push(
      `horario ${DEMO_SCHEDULE.startTime}-${DEMO_SCHEDULE.endTime} (pausa ${DEMO_SCHEDULE.breakStart}-${DEMO_SCHEDULE.breakEnd}): ya existía`,
    );
  } else {
    await Schedule.create({
      doctor: doctor._id,
      startTime: DEMO_SCHEDULE.startTime,
      endTime: DEMO_SCHEDULE.endTime,
      breakStart: DEMO_SCHEDULE.breakStart,
      breakEnd: DEMO_SCHEDULE.breakEnd,
      active: true,
    });
    summary.push(
      `horario ${DEMO_SCHEDULE.startTime}-${DEMO_SCHEDULE.endTime} (pausa ${DEMO_SCHEDULE.breakStart}-${DEMO_SCHEDULE.breakEnd}): creado`,
    );
  }

  // =================================================
  // Alinear la pausa de la clínica en los horarios
  // activos que abarquen el tramo 12:00-14:00 y aún no
  // tengan pausa. Solo se ajusta la pausa; no se cambia
  // el horario de cada odontólogo.
  // =================================================

  const activeSchedules = await Schedule.find({
    active: true,
    breakStart: { $in: [null, ""] },
  });

  for (const activeSchedule of activeSchedules) {
    if (
      activeSchedule.startTime <= DEMO_SCHEDULE.breakStart &&
      activeSchedule.endTime >= DEMO_SCHEDULE.breakEnd
    ) {
      activeSchedule.breakStart = DEMO_SCHEDULE.breakStart;
      activeSchedule.breakEnd = DEMO_SCHEDULE.breakEnd;

      await activeSchedule.save();

      summary.push(
        `horario ${activeSchedule.startTime}-${activeSchedule.endTime}: pausa ${DEMO_SCHEDULE.breakStart}-${DEMO_SCHEDULE.breakEnd} aplicada`,
      );
    }
  }

  console.log("Resumen del seed:");
  for (const line of summary) {
    console.log(`- ${line}`);
  }

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error("Error ejecutando el seed:", error.message);

  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  process.exit(1);
});
