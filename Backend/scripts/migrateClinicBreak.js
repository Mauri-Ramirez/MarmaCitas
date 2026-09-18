/**
 * =====================================================
 * Migración: Jornada de la clínica en horarios activos
 * -----------------------------------------------------
 * Alinea los horarios activos existentes con la regla de
 * la jornada de la clínica (08:00-12:00 y 14:00-17:00):
 *
 * - Si el horario abarca el almuerzo (12:00-14:00) y no
 *   tiene pausa, se aplica la pausa de la clínica.
 * - Cualquier horario que, tras el ajuste, siga fuera de
 *   la jornada de la clínica se reporta para revisión
 *   manual sin modificar datos.
 *
 * Uso:  npm run migrate:clinic   (desde Backend)
 * =====================================================
 */

import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import Schedule from "../models/Schedule.js";
import {
  CLINIC_BREAK_START,
  CLINIC_BREAK_END,
  scheduleFitsClinicHours,
} from "../config/clinicSchedule.js";

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

  const updated = [];
  const warnings = [];

  const schedules = await Schedule.find({ active: true });

  for (const schedule of schedules) {
    const hadBreak = !!(schedule.breakStart && schedule.breakEnd);

    if (
      !hadBreak &&
      schedule.startTime <= CLINIC_BREAK_START &&
      schedule.endTime >= CLINIC_BREAK_END
    ) {
      schedule.breakStart = CLINIC_BREAK_START;
      schedule.breakEnd = CLINIC_BREAK_END;

      await schedule.save();

      updated.push(
        `${schedule._id} (${schedule.startTime}-${schedule.endTime}): pausa ${CLINIC_BREAK_START}-${CLINIC_BREAK_END} aplicada`,
      );
    }

    if (
      !scheduleFitsClinicHours({
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
      })
    ) {
      warnings.push(
        `${schedule._id} (${schedule.startTime}-${schedule.endTime}${
          hadBreak ? `, pausa ${schedule.breakStart}-${schedule.breakEnd}` : ""
        }): fuera de la jornada de la clínica, requiere revisión`,
      );
    }
  }

  console.log(`Horarios corregidos: ${updated.length}`);

  for (const line of updated) {
    console.log(`- ${line}`);
  }

  if (warnings.length > 0) {
    console.log(
      `Horarios fuera de la jornada (revisión manual): ${warnings.length}`,
    );

    for (const line of warnings) {
      console.log(`- ${line}`);
    }
  }

  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error("Error ejecutando la migración:", error.message);

  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  process.exit(1);
});