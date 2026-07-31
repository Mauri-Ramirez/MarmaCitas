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
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
