import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    // =================================================
    // Paciente
    // =================================================

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =================================================
    // Odontólogo
    // =================================================

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =================================================
    // Servicio
    // =================================================

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    // =================================================
    // Fecha y hora de la cita
    // =================================================

    dateTime: {
      type: Date,
      required: true,
    },

    // =================================================
    // Estado de la cita
    // =================================================

    status: {
      type: String,
      enum: ["confirmed", "in_progress", "completed", "cancelled", "no_show"],
      default: "confirmed",
      required: true,
    },

    // =================================================
    // Estado del pago
    // =================================================

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      required: true,
    },

    // =================================================
    // Snapshot del servicio
    // =================================================

    serviceSnapshot: {
      serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },

      name: {
        type: String,
        required: true,
      },

      duration: {
        type: Number,
        required: true,
      },

      price: {
        type: Number,
        required: true,
      },
    },

    // =================================================
    // Observaciones de la cita
    // =================================================

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // =================================================
    // Auditoría
    // =================================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastStatusChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
