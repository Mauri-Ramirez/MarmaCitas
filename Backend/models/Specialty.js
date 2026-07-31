import mongoose from "mongoose";

/**
 * Modelo: Specialty
 *
 * Representa una especialidad odontológica.
 *
 * Relaciones:
 * - Una especialidad puede tener muchos servicios.
 * - Una especialidad puede tener muchos odontólogos.
 *
 */

const specialtySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la especialidad es obligatorio."],
      unique: true,
      trim: true,
      maxlength: [50, "El nombre no puede superar los 50 caracteres."],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "La descripción no puede superar los 300 caracteres."],
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

const Specialty = mongoose.model("Specialty", specialtySchema);

export default Specialty;
