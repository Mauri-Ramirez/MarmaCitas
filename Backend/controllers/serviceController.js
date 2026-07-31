import Service from "../models/Service.js";
import Specialty from "../models/Specialty.js";

/**
 * =====================================================
 * Controlador: Service
 * -----------------------------------------------------
 * Gestiona las operaciones CRUD de los servicios
 * odontológicos.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

/**
 * Obtener todos los servicios activos
 */
export const getServices = async (req, res) => {
  try {
    const services = await Service.find({ active: true }).populate(
      "specialty",
      "name",
    );

    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los servicios.",
      error: error.message,
    });
  }
};

/**
 * Obtener un servicio por ID
 */
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "specialty",
      "name",
    );

    if (!service || !service.active) {
      return res.status(404).json({
        message: "Servicio no encontrado.",
      });
    }

    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el servicio.",
      error: error.message,
    });
  }
};

/**
 * Crear servicio
 */
export const createService = async (req, res) => {
  try {
    const { name, description, duration, price, specialty } = req.body;

    // =================================================
    // Validar que exista la especialidad
    // =================================================

    const specialtyExists = await Specialty.findById(specialty);

    if (!specialtyExists) {
      return res.status(404).json({
        message: "La especialidad no existe.",
      });
    }

    // =================================================
    // Validar que esté activa
    // =================================================

    if (!specialtyExists.active) {
      return res.status(400).json({
        message: "La especialidad se encuentra inactiva.",
      });
    }

    // =================================================
    // Validar duplicado
    // =================================================

    const serviceExists = await Service.findOne({
      name,
      specialty,
      active: true,
    });

    if (serviceExists) {
      return res.status(400).json({
        message: "Ya existe un servicio con ese nombre en esta especialidad.",
      });
    }

    // =================================================
    // Crear servicio
    // =================================================

    const service = await Service.create({
      name,
      description,
      duration,
      price,
      specialty,
    });

    res.status(201).json({
      message: "Servicio creado correctamente.",
      service,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear el servicio.",
      error: error.message,
    });
  }
};

/**
 * Actualizar servicio
 */
export const updateService = async (req, res) => {
  try {
    const { name, description, duration, price, specialty } = req.body;

    // =================================================
    // Validar especialidad
    // =================================================

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

    // =================================================
    // Validar duplicados
    // =================================================

    const duplicated = await Service.findOne({
      _id: { $ne: req.params.id },
      name,
      specialty,
      active: true,
    });

    if (duplicated) {
      return res.status(400).json({
        message: "Ya existe un servicio con ese nombre en esta especialidad.",
      });
    }

    // =================================================
    // Actualizar
    // =================================================

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        duration,
        price,
        specialty,
      },
      {
        new: true,
        runValidators: true,
      },
    ).populate("specialty", "name");

    if (!service) {
      return res.status(404).json({
        message: "Servicio no encontrado.",
      });
    }

    res.status(200).json({
      message: "Servicio actualizado correctamente.",
      service,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el servicio.",
      error: error.message,
    });
  }
};

/**
 * Desactivar servicio (Soft Delete)
 */
export const deactivateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        active: false,
      },
      {
        new: true,
      },
    );

    if (!service) {
      return res.status(404).json({
        message: "Servicio no encontrado.",
      });
    }

    res.status(200).json({
      message: "Servicio desactivado correctamente.",
      service,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar el servicio.",
      error: error.message,
    });
  }
};
