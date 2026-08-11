import mongoose from "mongoose";

/**
 * =====================================================
 * Modelo: Schedule
 * -----------------------------------------------------
 * Representa el horario laboral asignado a un
 * odontólogo del consultorio.
 *
 * Cada odontólogo puede tener un único horario activo.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

const scheduleSchema = new mongoose.Schema(
  {
    // =================================================
    // Odontólogo
    // =================================================

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // =================================================
    // Hora de inicio
    // =================================================

    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    // =================================================
    // Hora de finalización
    // =================================================

    endTime: {
      type: String,
      required: true,
      trim: true,
    },

    // =================================================
    // Estado
    // =================================================

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Schedule = mongoose.model("Schedule", scheduleSchema);

export default Schedule;
