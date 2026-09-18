/**
 * =====================================================
 * Migración: separar motivo de consulta / nota clínica
 * -----------------------------------------------------
 * Estrategia conservadora aprobada:
 *
 * - `notes` existente → `reason` (motivo de consulta).
 * - NO se clasifica automáticamente como `clinicalNotes`
 *   (no existe señal confiable de quién escribió el texto).
 * - El campo crudo `notes` se CONSERVA en MongoDB (ya no
 *   está en el schema, por lo que no aparece en ninguna
 *   respuesta de la API; queda solo como registro).
 * - Se genera un reporte de citas ATENDIDAS
 *   (in_progress/completed) que tenían `notes`, como
 *   candidatos a revisión manual por la clínica.
 *
 * Idempotente: solo procesa documentos con `notes` y sin
 * `reason` aún.
 *
 * Uso:  npm run migrate:notes   (desde Backend)
 * =====================================================
 */

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import Appointment from "../models/Appointment.js";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI no está configurada.");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
  });
};

const migrate = async () => {
  await connectDB();

  // Se usa .lean() porque `notes` ya no está en el schema:
  // la consulta devuelve el documento crudo de MongoDB, que
  // conserva el campo legacy.
  const candidates = await Appointment.find({
    notes: { $exists: true, $nin: ["", null] },
    $or: [{ reason: { $exists: false } }, { reason: { $in: ["", null] } }],
  }).lean();

  const migrated = [];

  const reviewCandidates = [];

  for (const appointment of candidates) {
    await Appointment.collection.updateOne(
      { _id: appointment._id },
      { $set: { reason: appointment.notes } },
    );

    migrated.push(String(appointment._id));

    if (["in_progress", "completed"].includes(appointment.status)) {
      reviewCandidates.push({
        id: String(appointment._id),
        status: appointment.status,
        dateTime: appointment.dateTime?.toISOString() ?? null,
        doctor: String(appointment.doctor),
        characters: appointment.notes.length,
      });
    }
  }

  console.log(`Citas migradas (notes → reason): ${migrated.length}`);

  if (reviewCandidates.length > 0) {
    console.log(
      `\nCandidatas a revisión manual (atendidas con notes; podrían ser nota clínica): ${reviewCandidates.length}`,
    );

    for (const candidate of reviewCandidates) {
      console.log(
        `- id=${candidate.id} | estado=${candidate.status} | fecha=${candidate.dateTime} | doctor=${candidate.doctor} | chars=${candidate.characters}`,
      );
    }
  } else {
    console.log("\nSin candidatas a revisión manual.");
  }

  console.log(
    "\nNota: el campo crudo 'notes' se conserva en MongoDB; al no estar en el schema no aparece en las respuestas de la API.",
  );

  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error("Error ejecutando la migración:", error.message);

  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  process.exit(1);
});