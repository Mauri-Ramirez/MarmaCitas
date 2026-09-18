import mongoose from "mongoose";

import Schedule from "../models/Schedule.js";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import {
  CLINIC_HOURS_MESSAGE,
  scheduleFitsClinicHours,
  buildDoctorSegmentsMinutes,
  intersectMinutesSegments,
  CLINIC_SEGMENTS_MINUTES,
} from "../config/clinicSchedule.js";
import { getBogotaParts } from "./appointmentController.js";

/**
 * Convertir hora/minuto (America/Bogota) a minutos.
 */
const minutesFromParts = ({ hour, minute }) => hour * 60 + minute;

/**
 * ¿El intervalo [startMin, endMin] queda completamente
 * dentro de alguno de los tramos indicados?
 */
const isCovered = (startMin, endMin, segments) =>
  segments.some(
    (segment) => startMin >= segment.start && endMin <= segment.end,
  );

/**
 * Citas futuras confirmadas del odontólogo que quedan
 * fuera de cobertura con el NUEVO horario y que SÍ estaban
 * cubiertas con el horario ACTUAL (regla comparativa para
 * no congelar la administración por citas legacy).
 */
const findUncoveredFutureAppointments = async ({
  doctorId,
  currentSchedule,
  newSchedule,
}) => {
  const currentSegments = intersectMinutesSegments(
    buildDoctorSegmentsMinutes(currentSchedule),
    CLINIC_SEGMENTS_MINUTES,
  );

  const newSegments = intersectMinutesSegments(
    buildDoctorSegmentsMinutes(newSchedule),
    CLINIC_SEGMENTS_MINUTES,
  );

  const appointments = await Appointment.find({
    doctor: doctorId,
    status: "confirmed",
    dateTime: { $gt: new Date() },
  }).select("dateTime serviceSnapshot");

  return appointments.filter((appointment) => {
    const startMin = minutesFromParts(getBogotaParts(appointment.dateTime));

    const endDate = new Date(
      appointment.dateTime.getTime() +
        appointment.serviceSnapshot.duration * 60 * 1000,
    );

    const endMin = minutesFromParts(getBogotaParts(endDate));

    const wasCovered = isCovered(startMin, endMin, currentSegments);

    const nowCovered = isCovered(startMin, endMin, newSegments);

    return wasCovered && !nowCovered;
  });
};

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
 * Validar pausa opcional de la jornada.
 *
 * La pausa solo es válida si:
 * - ambos extremos se envían juntos,
 * - tienen formato HH:mm,
 * - quedan estrictamente dentro del horario laboral:
 *   inicio < breakStart < breakEnd < fin.
 */
const validateBreak = ({ startTime, endTime, breakStart, breakEnd }) => {
  if (breakStart === undefined && breakEnd === undefined) {
    return { valid: true };
  }

  if (
    !breakStart ||
    !breakEnd ||
    !isValidTimeFormat(breakStart) ||
    !isValidTimeFormat(breakEnd)
  ) {
    return {
      valid: false,
      message: "Las horas de pausa deben tener el formato HH:mm.",
    };
  }

  if (
    !(
      startTime < breakStart &&
      breakStart < breakEnd &&
      breakEnd < endTime
    )
  ) {
    return {
      valid: false,
      message:
        "La pausa debe estar dentro del horario laboral (inicio < pausa de inicio < pausa de fin < fin).",
    };
  }

  return { valid: true };
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
 * Obtener el horario activo del odontólogo autenticado
 */
export const getMySchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      doctor: req.user.id,
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
 * Obtener horario activo de un odontólogo por ID
 *
 * GET /api/schedules/doctor/:doctorId
 *
 * Acceso:
 * Recepción y administrador.
 */
export const getScheduleByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({
        message: "El identificador del odontólogo no es válido.",
      });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor",
    });

    if (!doctor) {
      return res.status(404).json({
        message: "Odontólogo no encontrado.",
      });
    }

    const schedule = await Schedule.findOne({
      doctor: doctor._id,
      active: true,
    }).populate("doctor", "name email professionalLicense");

    if (!schedule) {
      return res.status(404).json({
        message: "El odontólogo no tiene un horario activo.",
      });
    }

    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el horario del odontólogo.",
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
    const { doctor, startTime, endTime, breakStart, breakEnd } = req.body;

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
    // Validar pausa opcional
    // =================================================

    const breakValidation = validateBreak({
      startTime,
      endTime,
      breakStart,
      breakEnd,
    });

    if (!breakValidation.valid) {
      return res.status(400).json({
        message: breakValidation.message,
      });
    }

    // =================================================
    // Validar jornada de la clínica
    //
    // Todo el horario (incluida la pausa) debe quedar
    // dentro de la jornada fija del consultorio
    // (08:00-12:00 y 14:00-17:00).
    // =================================================

    if (
      !scheduleFitsClinicHours({
        startTime,
        endTime,
        breakStart,
        breakEnd,
      })
    ) {
      return res.status(400).json({
        message: CLINIC_HOURS_MESSAGE,
      });
    }

    // =================================================
    // Crear horario
    // =================================================

    const schedule = await Schedule.create({
      doctor,
      startTime,
      endTime,
      breakStart,
      breakEnd,
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
    // =================================================
    // Conflicto de unicidad del índice parcial
    // { doctor: 1 } active: true.
    //
    // El check previo en el controller no es atómico: dos
    // creaciones concurrentes para el mismo odontólogo
    // pueden pasar la validación y una de ellas chocar
    // contra el índice único (E11000).
    // =================================================

    if (error.code === 11000) {
      return res.status(409).json({
        message: "El odontólogo ya tiene un horario asignado.",
      });
    }

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
    const { startTime, endTime, breakStart, breakEnd } = req.body;

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
    // Validar pausa opcional
    // =================================================

    const breakValidation = validateBreak({
      startTime,
      endTime,
      breakStart,
      breakEnd,
    });

    if (!breakValidation.valid) {
      return res.status(400).json({
        message: breakValidation.message,
      });
    }

    // =================================================
    // Validar jornada de la clínica
    // =================================================

    if (
      !scheduleFitsClinicHours({
        startTime,
        endTime,
        breakStart,
        breakEnd,
      })
    ) {
      return res.status(400).json({
        message: CLINIC_HOURS_MESSAGE,
      });
    }

    // =================================================
    // Validar cobertura de citas futuras confirmadas.
    //
    // No se permite modificar el horario si el nuevo
    // horario deja fuera de cobertura alguna cita futura
    // que SÍ estaba cubierta por el horario actual.
    // =================================================

    const uncoveredAppointments = await findUncoveredFutureAppointments({
      doctorId: schedule.doctor,
      currentSchedule: schedule,
      newSchedule: { startTime, endTime, breakStart, breakEnd },
    });

    if (uncoveredAppointments.length > 0) {
      return res.status(409).json({
        message: `El nuevo horario deja ${uncoveredAppointments.length} cita(s) futura(s) fuera de cobertura. Ajusta esas citas antes de modificar el horario.`,
      });
    }

    // =================================================
    // Actualizar horario
    // =================================================

    schedule.startTime = startTime;
    schedule.endTime = endTime;
    schedule.breakStart = breakStart;
    schedule.breakEnd = breakEnd;

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
