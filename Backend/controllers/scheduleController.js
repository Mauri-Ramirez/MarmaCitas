import Schedule from "../models/Schedule.js";
import User from "../models/User.js";

/**
 * =====================================================
 * Controlador: Schedule
 * -----------------------------------------------------
 * Gestiona las operaciones CRUD de los horarios
 * laborales de los odontólogos.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

/**
 * Validar formato de hora HH:mm
 */
const isValidTimeFormat = (time) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  return timeRegex.test(time);
};

/**
 * Obtener todos los horarios activos
 */
export const getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find({
      active: true,
    }).populate("doctor", "name email professionalLicense");

    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los horarios.",
      error: error.message,
    });
  }
};

/**
 * Obtener horario por ID
 */
export const getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      active: true,
    }).populate("doctor", "name email professionalLicense");

    if (!schedule) {
      return res.status(404).json({
        message: "Horario no encontrado.",
      });
    }

    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el horario.",
      error: error.message,
    });
  }
};

/**
 * Crear horario
 */
export const createSchedule = async (req, res) => {
  try {
    const { doctor, startTime, endTime } = req.body;

    // =================================================
    // Validar que exista el odontólogo
    // =================================================

    const doctorExists = await User.findById(doctor);

    if (!doctorExists) {
      return res.status(404).json({
        message: "El odontólogo no existe.",
      });
    }

    // =================================================
    // Validar rol
    // =================================================

    if (doctorExists.role !== "doctor") {
      return res.status(400).json({
        message: "El usuario seleccionado no es un odontólogo.",
      });
    }

    // =================================================
    // Validar estado
    // =================================================

    if (!doctorExists.active) {
      return res.status(400).json({
        message: "El odontólogo se encuentra inactivo.",
      });
    }

    // =================================================
    // Validar horario existente
    // =================================================

    const scheduleExists = await Schedule.findOne({
      doctor,
      active: true,
    });

    if (scheduleExists) {
      return res.status(409).json({
        message: "El odontólogo ya tiene un horario asignado.",
      });
    }

    // =================================================
    // Validar formato de horas
    // =================================================

    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return res.status(400).json({
        message: "Las horas deben tener el formato HH:mm.",
      });
    }

    // =================================================
    // Validar horas
    // =================================================

    if (startTime >= endTime) {
      return res.status(400).json({
        message:
          "La hora de inicio debe ser menor que la hora de finalización.",
      });
    }

    // =================================================
    // Crear horario
    // =================================================

    const schedule = await Schedule.create({
      doctor,
      startTime,
      endTime,
    });

    const scheduleResponse = await Schedule.findById(schedule._id).populate(
      "doctor",
      "name email professionalLicense",
    );

    res.status(201).json({
      message: "Horario creado correctamente.",
      schedule: scheduleResponse,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear el horario.",
      error: error.message,
    });
  }
};

/**
 * Actualizar horario
 */
export const updateSchedule = async (req, res) => {
  try {
    const { startTime, endTime } = req.body;

    // =================================================
    // Buscar horario
    // =================================================

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      active: true,
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Horario no encontrado.",
      });
    }

    // =================================================
    // Validar formato de horas
    // =================================================

    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return res.status(400).json({
        message: "Las horas deben tener el formato HH:mm.",
      });
    }

    // =================================================
    // Validar horas
    // =================================================

    if (startTime >= endTime) {
      return res.status(400).json({
        message:
          "La hora de inicio debe ser menor que la hora de finalización.",
      });
    }

    // =================================================
    // Actualizar horario
    // =================================================

    schedule.startTime = startTime;
    schedule.endTime = endTime;

    await schedule.save();

    const updatedSchedule = await Schedule.findById(schedule._id).populate(
      "doctor",
      "name email professionalLicense",
    );

    res.status(200).json({
      message: "Horario actualizado correctamente.",
      schedule: updatedSchedule,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el horario.",
      error: error.message,
    });
  }
};

/**
 * Desactivar horario (Soft Delete)
 */
export const deactivateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      active: true,
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Horario no encontrado.",
      });
    }

    schedule.active = false;

    await schedule.save();

    const scheduleResponse = await Schedule.findById(schedule._id).populate(
      "doctor",
      "name email professionalLicense",
    );

    res.status(200).json({
      message: "Horario desactivado correctamente.",
      schedule: scheduleResponse,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar el horario.",
      error: error.message,
    });
  }
};
