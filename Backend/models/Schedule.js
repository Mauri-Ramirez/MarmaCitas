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
    // Pausa opcional de la jornada (ej. almuerzo).
    //
    // Si se definen breakStart/breakEnd, la jornada se
    // divide en dos tramos: inicio → pausa y pausa → fin.
    // Ambos deben enviarse juntos; si no se envían, la
    // jornada se mantiene como un único tramo continuo.
    // =================================================

    breakStart: {
      type: String,
      trim: true,
    },

    breakEnd: {
      type: String,
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

// =====================================================
// Máximo un horario ACTIVO por odontólogo.
//
// El índice único es parcial: solo aplica a documentos
// con active: true. Los horarios históricos desactivados
// (soft delete) pueden coexistir sin bloquear la creación
// de un horario de reemplazo.
//
// NOTA OPERATIVA: si la colección ya tiene el índice
// antiguo { doctor: 1 } unique global, debe eliminarse
// manualmente (dropIndex) para que Mongoose pueda crear
// el parcial; Mongoose no reemplaza índices existentes.
// =====================================================

scheduleSchema.index(
  { doctor: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
  },
);

const Schedule = mongoose.model("Schedule", scheduleSchema);

export default Schedule;
