import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import mongoose from "mongoose";

const patientFields =
  "name email role active phone allergies medicalNotes createdAt updatedAt";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const PATIENT_ONLY_FIELD_LIMITS = {
  phone: 20,
  allergies: 300,
  medicalNotes: 1000,
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const userListFields =
  "name email role active phone specialty professionalLicense createdAt updatedAt";

const userListQueryParams = new Set(["role", "search", "page", "limit"]);

const USER_LIST_ROLES = ["patient", "doctor", "receptionist", "admin"];

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
    // Teléfono, alergias y observaciones médicas:
    // solo el paciente puede actualizarlos.
    // =================================================

    const requestedPatientFields = Object.keys(
      PATIENT_ONLY_FIELD_LIMITS,
    ).filter((field) => req.body[field] !== undefined);

    const hasPatientOnlyFields = requestedPatientFields.length > 0;

    if (hasPatientOnlyFields && req.user.role !== "patient") {
      return res.status(400).json({
        message:
          "Solo los pacientes pueden actualizar teléfono, alergias y observaciones médicas.",
      });
    }

    // =================================================
    // Validar tipos y longitudes de los campos
    // adicionales
    // =================================================

    const normalizedPatientFields = {};

    for (const field of requestedPatientFields) {
      const value = req.body[field];

      if (typeof value !== "string") {
        return res.status(400).json({
          message: `El campo ${field} debe ser un texto.`,
        });
      }

      const normalizedValue = value.trim();

      const limit = PATIENT_ONLY_FIELD_LIMITS[field];

      if (normalizedValue.length > limit) {
        return res.status(400).json({
          message: `El campo ${field} no puede superar los ${limit} caracteres.`,
        });
      }

      normalizedPatientFields[field] = normalizedValue;
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

    for (const field of requestedPatientFields) {
      user[field] = normalizedPatientFields[field];
    }

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

query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
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
 * Obtener usuarios con filtros (administrador)
 * =====================================================
 *
 * GET /api/users
 *
 * Acceso:
 * Administrador.
 */
export const getUsers = async (req, res) => {
  try {
    const unknownQueryParam = Object.keys(req.query).find(
      (param) => !userListQueryParams.has(param),
    );

    if (unknownQueryParam) {
      return res.status(400).json({
        message: `El parámetro ${unknownQueryParam} no está permitido.`,
      });
    }

    const { role, search, page = "1", limit = "10" } = req.query;

    if (
      (role !== undefined && typeof role !== "string") ||
      (search !== undefined && typeof search !== "string") ||
      typeof page !== "string" ||
      typeof limit !== "string"
    ) {
      return res.status(400).json({
        message: "Los parámetros de filtrado y paginación no son válidos.",
      });
    }

    if (role !== undefined && !USER_LIST_ROLES.includes(role)) {
      return res.status(400).json({
        message: "El rol solicitado no es válido.",
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

    const query = {};

    if (role !== undefined) {
      query.role = role;
    }

    const normalizedSearch = search?.trim();

    if (normalizedSearch) {
      const searchRegex = new RegExp(escapeRegex(normalizedSearch), "i");

      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select(userListFields)
        .populate("specialty", "name")
        .sort({ name: 1, _id: 1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      users,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        pages: Math.ceil(total / currentLimit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los usuarios.",
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

/**
 * =====================================================
 * Actualizar datos básicos de un paciente
 * =====================================================
 *
 * PUT /api/users/patients/:id
 *
 * Acceso:
 * Recepción y administrador.
 */
export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "El identificador del paciente no es válido.",
      });
    }

    const body = req.body || {};

    const allowedFields = ["name", "phone", "allergies", "medicalNotes"];
    const invalidFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: "El cuerpo de la solicitud contiene campos no permitidos.",
      });
    }

    const providedFields = allowedFields.filter(
      (field) => body[field] !== undefined,
    );

    if (providedFields.length === 0) {
      return res.status(400).json({
        message:
          "Debes proporcionar al menos un campo para actualizar.",
      });
    }

    // =================================================
    // Validar tipos y longitudes
    // =================================================

    const fieldLimits = {
      phone: 20,
      allergies: 300,
      medicalNotes: 1000,
    };

    const normalizedFields = {};

    for (const field of providedFields) {
      const value = body[field];

      if (typeof value !== "string") {
        return res.status(400).json({
          message: `El campo ${field} debe ser un texto.`,
        });
      }

      const normalizedValue = value.trim();

      if (field === "name" && !normalizedValue) {
        return res.status(400).json({
          message: "El nombre no puede quedar vacío.",
        });
      }

      const limit = fieldLimits[field];

      if (limit && normalizedValue.length > limit) {
        return res.status(400).json({
          message: `El campo ${field} no puede superar los ${limit} caracteres.`,
        });
      }

      normalizedFields[field] = normalizedValue;
    }

    // =================================================
    // Buscar el paciente
    // =================================================

    const patient = await User.findOne({
      _id: id,
      role: "patient",
    });

    if (!patient) {
      return res.status(404).json({
        message: "Paciente no encontrado.",
      });
    }

    // =================================================
    // Actualizar campos
    // =================================================

    for (const field of providedFields) {
      patient[field] = normalizedFields[field];
    }

    await patient.save();

    const updatedPatient = await User.findById(patient._id).select(
      patientFields,
    );

    res.status(200).json({
      message: "Paciente actualizado correctamente.",
      patient: updatedPatient,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el paciente.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Activar/desactivar un usuario (administrador)
 * -----------------------------------------------------
 * PATCH /api/users/:id/active
 *
 * Acceso:
 * Administrador.
 *
 * Un administrador no puede cambiar su propio estado de
 * actividad.
 * =====================================================
 */
export const setUserActive = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "El identificador del usuario no es válido.",
      });
    }

    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({
        message: "El campo active debe ser un valor booleano.",
      });
    }

    // =================================================
    // Guard: el administrador no puede desactivarse a
    // sí mismo (ni cambiar su propio estado).
    // =================================================

    if (id === req.user.id) {
      return res.status(400).json({
        message: "No puedes cambiar tu propio estado de actividad.",
      });
    }

    // =================================================
    // Buscar el usuario
    // =================================================

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado.",
      });
    }

    // =================================================
    // Al desactivar un odontólogo se aplica la misma
    // regla que en deactivateDoctor: no se permite si
    // tiene citas que todavía requieren atención.
    // =================================================

    if (!active && user.role === "doctor") {
      const blockingAppointments = await Appointment.countDocuments({
        doctor: user._id,
        $or: [
          { status: "in_progress" },
          { status: "confirmed", dateTime: { $gt: new Date() } },
        ],
      });

      if (blockingAppointments > 0) {
        return res.status(409).json({
          message: `El odontólogo tiene ${blockingAppointments} cita(s) pendiente(s) o futura(s). Gestiona esas citas antes de desactivarlo.`,
        });
      }
    }

    // =================================================
    // Actualizar estado
    // =================================================

    user.active = active;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select(userListFields)
      .populate("specialty", "name");

    res.status(200).json({
      message: active
        ? "Usuario reactivado correctamente."
        : "Usuario desactivado correctamente.",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el estado del usuario.",
      error: error.message,
    });
  }
};
