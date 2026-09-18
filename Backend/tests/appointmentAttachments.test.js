import { test, before, after, beforeEach } from "node:test";

import assert from "node:assert/strict";

import dotenv from "dotenv";

dotenv.config();

// Los tests usan SIEMPRE un directorio de uploads aislado
// propio, independientemente de cualquier UPLOADS_DIR que
// exista en el entorno. Así jamás pueden borrar los
// archivos reales subidos desde la app.
process.env.UPLOADS_DIR = path.resolve("uploads-test", "appointments");

import path from "path";

import mongoose from "mongoose";

import jwt from "jsonwebtoken";

import express from "express";

import { promises as fsp } from "fs";

import User from "../models/User.js";
import Specialty from "../models/Specialty.js";
import Service from "../models/Service.js";
import Appointment from "../models/Appointment.js";

import appointmentRoutes from "../routes/appointmentRoutes.js";
import {
  getUploadsDir,
  MAX_FILE_SIZE,
} from "../middlewares/uploadMiddleware.js";

const TEST_DB_NAME = "marmacitas_test";

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI no está configurada.");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET no está configurada.");
}

let server;
let baseUrl;

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

  const app = express();

  app.use(express.json());

  app.use("/api/appointments", appointmentRoutes);

  server = app.listen(0);

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));

  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Specialty.deleteMany({}),
    Service.deleteMany({}),
    Appointment.deleteMany({}),
  ]);

  // Salvaguarda: la limpieza solo debe poder apuntar al
  // directorio aislado de pruebas.
  if (!getUploadsDir().includes("uploads-test")) {
    throw new Error(
      "Los tests de adjuntos no pueden limpiar un directorio que no sea de prueba.",
    );
  }

  await fsp.rm(getUploadsDir(), { recursive: true, force: true });
});

let sequence = 0;

const uniqueSuffix = () =>
  `${Date.now()}_${++sequence}_${Math.floor(Math.random() * 1e6)}`;

const createWorld = async ({ status = "in_progress" } = {}) => {
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

  const otherDoctor = await User.create({
    name: "Otro Doctor",
    email: `otro.${suffix}@test.local`,
    password: "password123",
    role: "doctor",
    active: true,
    professionalLicense: `LIC2-${suffix}`,
    phone: "3001112222",
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
    duration: 30,
    price: 50000,
    specialty: specialty._id,
  });

  const appointment = await Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    service: service._id,
    dateTime: new Date(Date.now() + 60 * 60 * 1000),
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
  });

  return { specialty, doctor, otherDoctor, patient, service, appointment };
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

const uploadFiles = async (token, appointmentId, fileEntries) => {
  const form = new FormData();

  for (const entry of fileEntries) {
    form.append(
      "files",
      new Blob([entry.buffer], { type: entry.mimeType }),
      entry.filename,
    );
  }

  const response = await fetch(
    `${baseUrl}/api/appointments/${appointmentId}/attachments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    },
  );

  const body = await response.json().catch(() => null);

  return { status: response.status, body };
};

const downloadAttachment = async (token, appointmentId, attachmentId) => {
  const response = await fetch(
    `${baseUrl}/api/appointments/${appointmentId}/attachments/${attachmentId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const body = Buffer.from(await response.arrayBuffer());

  return {
    status: response.status,
    body,
    contentType: response.headers.get("content-type"),
    disposition: response.headers.get("content-disposition"),
  };
};

const listUploads = async () => {
  try {
    return await fsp.readdir(getUploadsDir());
  } catch {
    return [];
  }
};

const pdfEntry = (filename = "nota.pdf", size = 64) => ({
  filename,
  mimeType: "application/pdf",
  buffer: Buffer.alloc(size, 1),
});

const pngEntry = (filename = "imagen.png", size = 32) => ({
  filename,
  mimeType: "image/png",
  buffer: Buffer.alloc(size, 2),
});

test("sube archivos válidos a una cita en atención y persiste metadatos", async () => {
  const { doctor, appointment } = await createWorld({ status: "in_progress" });

  const result = await uploadFiles(signToken(doctor), appointment._id, [
    pdfEntry("nota.pdf"),
    pngEntry("imagen.png"),
  ]);

  assert.equal(result.status, 201);

  const attachments = result.body.appointment.attachments;

  assert.equal(attachments.length, 2);

  const pdf = attachments[0];

  assert.equal(pdf.filename, "nota.pdf");
  assert.equal(pdf.mimeType, "application/pdf");
  assert.equal(pdf.size, 64);
  assert.ok(pdf.storedName !== "nota.pdf", "storedName debe ser generado por el servidor");
  assert.ok(pdf.uploadedAt);

  const stored = await listUploads();

  assert.equal(stored.length, 2);

  for (const attachment of attachments) {
    assert.ok(stored.includes(attachment.storedName));
  }

  const saved = await Appointment.findById(appointment._id);

  assert.equal(saved.attachments.length, 2);
});

test("rechaza adjuntar archivos a una cita que no está en atención y limpia el disco", async () => {
  const { doctor, appointment } = await createWorld({ status: "confirmed" });

  const result = await uploadFiles(signToken(doctor), appointment._id, [
    pdfEntry("nota.pdf"),
  ]);

  assert.equal(result.status, 400);
  assert.equal(
    result.body.message,
    "Solo se pueden adjuntar archivos a una cita en atención.",
  );

  assert.deepEqual(await listUploads(), []);
});

test("rechaza un tipo de archivo no permitido", async () => {
  const { doctor, appointment } = await createWorld({ status: "in_progress" });

  const result = await uploadFiles(signToken(doctor), appointment._id, [
    { filename: "documento.txt", mimeType: "text/plain", buffer: Buffer.alloc(16) },
  ]);

  assert.equal(result.status, 400);
  assert.match(result.body.message, /Tipo de archivo no permitido/);

  assert.deepEqual(await listUploads(), []);
});

test("rechaza un archivo mayor a 10 MB", async () => {
  const { doctor, appointment } = await createWorld({ status: "in_progress" });

  const oversized = {
    filename: "grande.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(MAX_FILE_SIZE + 1),
  };

  const result = await uploadFiles(signToken(doctor), appointment._id, [
    oversized,
  ]);

  assert.equal(result.status, 400);
  assert.equal(result.body.message, "Cada archivo debe pesar máximo 10 MB.");

  assert.deepEqual(await listUploads(), []);
});

test("rechaza más de 5 archivos en una sola subida", async () => {
  const { doctor, appointment } = await createWorld({ status: "in_progress" });

  const files = Array.from({ length: 6 }, (_, index) =>
    pdfEntry(`archivo-${index}.pdf`),
  );

  const result = await uploadFiles(signToken(doctor), appointment._id, files);

  assert.equal(result.status, 400);
  assert.equal(result.body.message, "Máximo 5 archivos por cita.");

  assert.deepEqual(await listUploads(), []);
});

test("rechaza cuando existentes más nuevos superan 5 archivos por cita", async () => {
  const { doctor, appointment } = await createWorld({ status: "in_progress" });

  const firstBatch = await uploadFiles(signToken(doctor), appointment._id, [
    pdfEntry("a.pdf"),
    pdfEntry("b.pdf"),
    pdfEntry("c.pdf"),
    pdfEntry("d.pdf"),
    pdfEntry("e.pdf"),
  ]);

  assert.equal(firstBatch.status, 201);
  assert.equal((await listUploads()).length, 5);

  const extra = await uploadFiles(signToken(doctor), appointment._id, [
    pdfEntry("f.pdf"),
  ]);

  assert.equal(extra.status, 400);
  assert.equal(extra.body.message, "Máximo 5 archivos por cita.");

  assert.equal((await listUploads()).length, 5);
});

test("rechaza la subida de un odontólogo que no es dueño de la cita", async () => {
  const { otherDoctor, appointment } = await createWorld({ status: "in_progress" });

  const result = await uploadFiles(signToken(otherDoctor), appointment._id, [
    pdfEntry("nota.pdf"),
  ]);

  assert.equal(result.status, 403);

  assert.deepEqual(await listUploads(), []);
});

test("descarga un archivo inline con el filename original", async () => {
  const { doctor, appointment } = await createWorld({ status: "in_progress" });

  const uploaded = await uploadFiles(signToken(doctor), appointment._id, [
    pdfEntry("historia clinica.pdf", 128),
  ]);

  assert.equal(uploaded.status, 201);

  const attachmentId = uploaded.body.appointment.attachments[0]._id;

  const downloaded = await downloadAttachment(
    signToken(doctor),
    appointment._id,
    attachmentId,
  );

  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.contentType, "application/pdf");
  assert.equal(downloaded.body.length, 128);
  assert.match(downloaded.disposition, /^inline/);
  assert.ok(
    decodeURIComponent(downloaded.disposition).includes("historia clinica.pdf"),
    `el filename original debe conservarse en Content-Disposition: ${downloaded.disposition}`,
  );
});

test("rechaza la descarga de un odontólogo que no es dueño", async () => {
  const { doctor, otherDoctor, appointment } = await createWorld({
    status: "in_progress",
  });

  const uploaded = await uploadFiles(signToken(doctor), appointment._id, [
    pdfEntry("nota.pdf"),
  ]);

  const attachmentId = uploaded.body.appointment.attachments[0]._id;

  const downloaded = await downloadAttachment(
    signToken(otherDoctor),
    appointment._id,
    attachmentId,
  );

  assert.equal(downloaded.status, 403);
});

test("rechaza la descarga de un adjunto inexistente", async () => {
  const { doctor, appointment } = await createWorld({ status: "in_progress" });

  const downloaded = await downloadAttachment(
    signToken(doctor),
    appointment._id,
    new mongoose.Types.ObjectId(),
  );

  assert.equal(downloaded.status, 404);
});