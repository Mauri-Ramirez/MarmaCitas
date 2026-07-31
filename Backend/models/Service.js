import mongoose from "mongoose";

/**
 * =====================================================
 * Modelo: Service
 * -----------------------------------------------------
 * Representa un servicio odontológico ofrecido por
 * el consultorio.
 *
 * Responsabilidades:
 * - Definir nombre del servicio.
 * - Definir duración estándar.
 * - Definir precio.
 * - Asociar el servicio a una especialidad.
 * - Permitir reservas mediante citas.
 *
 * Relaciones:
 * - Service N ---- 1 Specialty
 * - Service 1 ---- N Appointment (Futuro)
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del servicio es obligatorio."],
      trim: true,
      maxlength: [100, "El nombre no puede superar los 100 caracteres."],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "La descripción no puede superar los 300 caracteres."],
    },

    duration: {
      type: Number,
      required: [true, "La duración es obligatoria."],
      min: [1, "La duración debe ser mayor que cero."],
    },

    price: {
      type: Number,
      required: [true, "El precio es obligatorio."],
      min: [1, "El precio debe ser mayor que cero."],
    },

    specialty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Specialty",
      required: [true, "La especialidad es obligatoria."],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;
