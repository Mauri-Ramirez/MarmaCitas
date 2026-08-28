import User from "../models/User.js";
import Specialty from "../models/Specialty.js";
import bcrypt from "bcryptjs";

/**
 * =====================================================
 * Controlador: Doctor
 * -----------------------------------------------------
 * Gestiona las operaciones CRUD de los odontólogos.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

/**
 * Obtener odontólogos activos
 *
 * Permite filtrar por especialidad mediante:
 *
 * GET /api/doctors?specialty=ID_ESPECIALIDAD
 */
export const getDoctors = async (req, res) => {
  try {
    const { specialty } = req.query;

    const filter = {
      role: "doctor",
      active: true,
    };

    // Filtrar por especialidad si fue proporcionada
    if (specialty) {
      filter.specialty = specialty;
    }

    const doctors = await User.find(filter)
      .select("-password")
      .populate("specialty", "name");

    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los odontólogos.",
      error: error.message,
    });
  }
};

/**
 * Obtener odontólogo por ID
 */
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await User.findOne({
      _id: req.params.id,
      role: "doctor",
      active: true,
    })
      .select("-password")
      .populate("specialty", "name");

    if (!doctor) {
      return res.status(404).json({
        message: "Odontólogo no encontrado.",
      });
    }

    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el odontólogo.",
      error: error.message,
    });
  }
};

/**
 * Crear odontólogo
 */
export const createDoctor = async (req, res) => {
  try {
    const { name, email, password, professionalLicense, phone, specialty } =
      req.body;

    // =================================================
    // Validar email
    // =================================================

    const emailExists = await User.findOne({ email });

    if (emailExists) {
      return res.status(409).json({
        message: "El correo electrónico ya está registrado.",
      });
    }

    // =================================================
    // Validar licencia profesional
    // =================================================

    const licenseExists = await User.findOne({
      professionalLicense,
    });

    if (licenseExists) {
      return res.status(409).json({
        message: "La licencia profesional ya existe.",
      });
    }

    // =================================================
    // Validar especialidad
    // =================================================

    const specialtyExists = await Specialty.findById(specialty);

    if (!specialtyExists) {
      return res.status(404).json({
        message: "La especialidad no existe.",
      });
    }

    // =================================================
    // Validar especialidad activa
    // =================================================

    if (!specialtyExists.active) {
      return res.status(400).json({
        message: "La especialidad está inactiva.",
      });
    }

    // =================================================
    // Encriptar contraseña
    // =================================================

    const hashedPassword = await bcrypt.hash(password, 10);

    // =================================================
    // Crear odontólogo
    // =================================================

    const doctor = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "doctor",
      professionalLicense,
      phone,
      specialty,
    });

    const doctorResponse = await User.findById(doctor._id)
      .select("-password")
      .populate("specialty", "name");

    res.status(201).json({
      message: "Odontólogo creado correctamente.",
      doctor: doctorResponse,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear el odontólogo.",
      error: error.message,
    });
  }
};

/**
 * Actualizar odontólogo
 */
export const updateDoctor = async (req, res) => {
  try {
    const { name, professionalLicense, phone, specialty } = req.body;

    // =================================================
    // Buscar odontólogo
    // =================================================

    const doctor = await User.findOne({
      _id: req.params.id,
      role: "doctor",
      active: true,
    });

    if (!doctor) {
      return res.status(404).json({
        message: "Odontólogo no encontrado.",
      });
    }

    // =================================================
    // Validar licencia duplicada
    // =================================================

    if (
      professionalLicense &&
      professionalLicense !== doctor.professionalLicense
    ) {
      const duplicated = await User.findOne({
        professionalLicense,
      });

      if (duplicated) {
        return res.status(409).json({
          message: "La licencia profesional ya existe.",
        });
      }
    }

    // =================================================
    // Validar especialidad
    // =================================================

    if (specialty) {
      const specialtyExists = await Specialty.findById(specialty);

      if (!specialtyExists) {
        return res.status(404).json({
          message: "La especialidad no existe.",
        });
      }

      if (!specialtyExists.active) {
        return res.status(400).json({
          message: "La especialidad está inactiva.",
        });
      }

      doctor.specialty = specialty;
    }

    // =================================================
    // Actualizar información
    // =================================================

    if (name) doctor.name = name;
    if (professionalLicense) doctor.professionalLicense = professionalLicense;
    if (phone) doctor.phone = phone;

    await doctor.save();

    const updatedDoctor = await User.findById(doctor._id)
      .select("-password")
      .populate("specialty", "name");

    res.status(200).json({
      message: "Odontólogo actualizado correctamente.",
      doctor: updatedDoctor,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el odontólogo.",
      error: error.message,
    });
  }
};

/**
 * Desactivar odontólogo (Soft Delete)
 */
export const deactivateDoctor = async (req, res) => {
  try {
    const doctor = await User.findOne({
      _id: req.params.id,
      role: "doctor",
      active: true,
    });

    if (!doctor) {
      return res.status(404).json({
        message: "Odontólogo no encontrado.",
      });
    }

    doctor.active = false;

    await doctor.save();

    const doctorResponse = await User.findById(doctor._id)
      .select("-password")
      .populate("specialty", "name");

    res.status(200).json({
      message: "Odontólogo desactivado correctamente.",
      doctor: doctorResponse,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar el odontólogo.",
      error: error.message,
    });
  }
};
