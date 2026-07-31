import Specialty from "../models/Specialty.js";

/**
 * =====================================================
 * Controlador: Specialty
 * -----------------------------------------------------
 * Gestiona las operaciones CRUD de las especialidades.
 * Proyecto: MarmaCitas
 * =====================================================
 */

// Obtener todas las especialidades activas
export const getSpecialties = async (req, res) => {
  try {
    const specialties = await Specialty.find({ active: true });

    res.status(200).json(specialties);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener las especialidades.",
      error: error.message,
    });
  }
};

// Obtener una especialidad por ID
export const getSpecialtyById = async (req, res) => {
  try {
    const specialty = await Specialty.findById(req.params.id);

    if (!specialty || !specialty.active) {
      return res.status(404).json({
        message: "Especialidad no encontrada.",
      });
    }

    res.status(200).json(specialty);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la especialidad.",
      error: error.message,
    });
  }
};

// Crear especialidad
export const createSpecialty = async (req, res) => {
  try {
    const specialty = await Specialty.create(req.body);

    res.status(201).json({
      message: "Especialidad creada correctamente.",
      specialty,
    });
  } catch (error) {
    res.status(400).json({
      message: "No fue posible crear la especialidad.",
      error: error.message,
    });
  }
};

// Actualizar especialidad
export const updateSpecialty = async (req, res) => {
  try {
    const specialty = await Specialty.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!specialty) {
      return res.status(404).json({
        message: "Especialidad no encontrada.",
      });
    }

    res.status(200).json({
      message: "Especialidad actualizada correctamente.",
      specialty,
    });
  } catch (error) {
    res.status(400).json({
      message: "No fue posible actualizar la especialidad.",
      error: error.message,
    });
  }
};

// Desactivar especialidad (Soft Delete)
export const deactivateSpecialty = async (req, res) => {
  try {
    const specialty = await Specialty.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
    );

    if (!specialty) {
      return res.status(404).json({
        message: "Especialidad no encontrada.",
      });
    }

    res.status(200).json({
      message: "Especialidad desactivada correctamente.",
      specialty,
    });
  } catch (error) {
    res.status(500).json({
      message: "No fue posible desactivar la especialidad.",
      error: error.message,
    });
  }
};
