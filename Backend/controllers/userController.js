import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import mongoose from "mongoose";

const patientFields = "name email role active createdAt updatedAt";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * =====================================================
 * Controlador: User
 * -----------------------------------------------------
 * Gestiona las operaciones relacionadas con el perfil
 * del usuario autenticado.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

/**
 * =====================================================
 * Obtener perfil del usuario autenticado
 * =====================================================
 *
 * GET /api/users/me
 *
 * El ID del usuario se obtiene desde el JWT mediante
 * req.user.id.
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("specialty", "name");

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado.",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el perfil.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Actualizar perfil del usuario autenticado
 * =====================================================
 *
 * PUT /api/users/me
 *
 * Por seguridad, el usuario solamente podrá modificar
 * información básica de su propio perfil.
 *
 * El email y los datos profesionales del odontólogo
 * se gestionarán posteriormente mediante reglas
 * específicas.
 */
export const updateMyProfile = async (req, res) => {
  try {
    const { name } = req.body;

    // =================================================
    // Validar nombre
    // =================================================

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "El nombre es obligatorio.",
      });
    }

    // =================================================
    // Buscar usuario autenticado
    // =================================================

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado.",
      });
    }

    // =================================================
    // Actualizar información básica
    // =================================================

    user.name = name.trim();

    await user.save();

    // =================================================
    // Obtener usuario actualizado sin contraseña
    // =================================================

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .populate("specialty", "name");

    res.status(200).json({
      message: "Perfil actualizado correctamente.",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el perfil.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Obtener pacientes
 * =====================================================
 *
 * GET /api/users/patients
 *
 * Acceso:
 * Recepción y administrador.
 */
export const getPatients = async (req, res) => {
  try {
    const { search, page = "1", limit = "10" } = req.query;

    if (
      (search !== undefined && typeof search !== "string") ||
      typeof page !== "string" ||
      typeof limit !== "string"
    ) {
      return res.status(400).json({
        message: "Los parámetros de búsqueda y paginación no son válidos.",
      });
    }

    if (!/^\d+$/.test(page) || !/^\d+$/.test(limit)) {
      return res.status(400).json({
        message: "Los parámetros page y limit deben ser enteros positivos.",
      });
    }

    const currentPage = Number(page);
    const currentLimit = Number(limit);

    if (currentPage < 1 || currentLimit < 1 || currentLimit > 50) {
      return res.status(400).json({
        message: "page debe ser mayor o igual a 1 y limit debe estar entre 1 y 50.",
      });
    }

    const query = { role: "patient" };
    const normalizedSearch = search?.trim();

    if (normalizedSearch) {
      const searchRegex = new RegExp(escapeRegex(normalizedSearch), "i");

      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const [patients, total] = await Promise.all([
      User.find(query)
        .select(patientFields)
        .sort({ name: 1, _id: 1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      patients,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        pages: Math.ceil(total / currentLimit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los pacientes.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Obtener un paciente por ID
 * =====================================================
 *
 * GET /api/users/patients/:id
 *
 * Acceso:
 * Recepción y administrador.
 */
export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "El identificador del paciente no es válido.",
      });
    }

    const patient = await User.findOne({
      _id: id,
      role: "patient",
    }).select(patientFields);

    if (!patient) {
      return res.status(404).json({
        message: "Paciente no encontrado.",
      });
    }

    res.status(200).json({ patient });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el paciente.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Crear paciente administrativo
 * =====================================================
 *
 * POST /api/users/patients
 *
 * Acceso:
 * Recepción y administrador.
 */
export const createPatient = async (req, res) => {
  try {
    const body = req.body || {};
    const allowedFields = ["name", "email"];
    const invalidFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: "El cuerpo de la solicitud contiene campos no permitidos.",
      });
    }

    const { name, email } = body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "El nombre es obligatorio y debe ser válido.",
      });
    }

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "El correo electrónico es obligatorio y debe ser válido.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "El correo electrónico no tiene un formato válido.",
      });
    }

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(409).json({
        message: "El correo electrónico ya está registrado.",
      });
    }

    const temporaryPassword = randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const patient = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "patient",
      active: true,
    });

    res.status(201).json({
      message: "Paciente creado correctamente.",
      patient: {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        role: patient.role,
        active: patient.active,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({
        message: "El correo electrónico ya está registrado.",
      });
    }

    res.status(500).json({
      message: "Error al crear el paciente.",
      error: error.message,
    });
  }
};
