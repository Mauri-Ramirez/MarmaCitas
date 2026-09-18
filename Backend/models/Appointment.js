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
    // Motivo de consulta (lo escribe el paciente al
    // agendar, o recepción/admin en su nombre).
    // =================================================

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    // =================================================
    // Nota de atención del odontólogo.
    //
    // Se registra durante la atención de la cita; no se
    // envía al paciente por la API.
    // =================================================

    clinicalNotes: {
      type: String,
      trim: true,
      default: "",
    },

    // =================================================
    // Archivos clínicos adjuntos a la cita
    //
    // Cada adjunto guarda solo metadatos; el archivo
    // físico vive en el disco local (uploads/appointments)
    // y se sirve mediante un endpoint autenticado.
    // =================================================

    attachments: [
      {
        filename: {
          type: String,
          required: true,
        },

        storedName: {
          type: String,
          required: true,
        },

        mimeType: {
          type: String,
          required: true,
        },

        size: {
          type: Number,
          required: true,
        },

        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

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

    // =================================================
    // Control optimista de concurrencia.
    //
    // Cada save() incluye __v en el filtro de actualización,
    // de modo que dos modificaciones concurrentes sobre la
    // misma cita no puedan aplicarse silenciosamente
    // (última escritura gana).
    // =================================================

    optimisticConcurrency: true,
  },
);

// =====================================================
// Índices de consulta para las validaciones de
// disponibilidad y los listados por doctor/paciente.
//
// No son índices únicos: la exclusión de intervalos
// solapados se garantiza mediante transacciones.
// =====================================================

appointmentSchema.index({ doctor: 1, status: 1, dateTime: 1 });

appointmentSchema.index({ patient: 1, status: 1, dateTime: 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
