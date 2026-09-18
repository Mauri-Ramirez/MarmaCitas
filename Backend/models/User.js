import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Información general
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["patient", "doctor", "receptionist", "admin"],
      default: "patient",
    },

    active: {
      type: Boolean,
      default: true,
    },

    // =================================================
    // Información médica del paciente
    // Editable solo por el paciente vía PUT /users/me;
    // visible para recepción y administración.
    // =================================================

    allergies: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        300,
        "Las alergias no pueden superar los 300 caracteres.",
      ],
    },

    medicalNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        1000,
        "Las observaciones médicas no pueden superar los 1000 caracteres.",
      ],
    },

    // Información profesional (solo odontólogos)
    professionalLicense: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      required: function () {
        return this.role === "doctor";
      },
    },

    phone: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "doctor";
      },
    },

    specialty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Specialty",
      required: function () {
        return this.role === "doctor";
      },
    },

    // =================================================
    // Contador técnico para serializar transacciones
    // de creación/reprogramación de citas.
    //
    // No forma parte del dominio y se excluye de las
    // consultas normales mediante select: false.
    // =================================================

    appointmentLockVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
