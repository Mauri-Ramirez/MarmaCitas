import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Schedule from "../models/Schedule.js";

/**
 * =====================================================
 * Controlador: Appointment
 * -----------------------------------------------------
 * Gestiona las operaciones relacionadas con las citas
 * odontológicas.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

/**
 * Estados que no deben bloquear un nuevo horario.
 *
 * Las citas canceladas no ocupan disponibilidad.
 * Las citas completadas y las inasistencias sí forman
 * parte del historial, pero ya no representan una
 * reserva futura.
 */
const activeAppointmentStatuses = ["confirmed", "in_progress"];

/**
 * =====================================================
 * Función auxiliar:
 * Calcular fecha de finalización
 * =====================================================
 *
 * Recibe:
 * - dateTime: fecha/hora de inicio
 * - duration: duración en minutos
 *
 * Devuelve:
 * - fecha/hora de finalización
 */
const calculateEndDateTime = (dateTime, duration) => {
  return new Date(dateTime.getTime() + duration * 60 * 1000);
};

/**
 * =====================================================
 * Función auxiliar:
 * Verificar solapamiento
 * =====================================================
 *
 * Dos intervalos se solapan cuando:
 *
 * inicioA < finB
 * &&
 * finA > inicioB
 *
 * Esto permite que:
 *
 * 14:00 - 14:30
 * 14:30 - 15:00
 *
 * sean válidos.
 */
const hasOverlap = (newStart, newEnd, existingStart, existingEnd) => {
  return newStart < existingEnd && newEnd > existingStart;
};

/**
 * =====================================================
 * Función auxiliar:
 * Obtener citas activas de un usuario
 * =====================================================
 */
const getActiveAppointments = async (field, userId) => {
  return Appointment.find({
    [field]: userId,
    status: { $in: activeAppointmentStatuses },
  }).select("dateTime serviceSnapshot status");
};

/**
 * =====================================================
 * Función auxiliar:
 * Validar disponibilidad
 * =====================================================
 */
const validateAvailability = async ({
  patient,
  doctor,
  dateTime,
  duration,
  appointmentId = null,
}) => {
  const newStart = dateTime;
  const newEnd = calculateEndDateTime(dateTime, duration);

  // =================================================
  // Citas del odontólogo
  // =================================================

  const doctorAppointments = await getActiveAppointments("doctor", doctor);

  for (const appointment of doctorAppointments) {
    if (
      appointmentId &&
      appointment._id.toString() === appointmentId.toString()
    ) {
      continue;
    }

    const existingStart = appointment.dateTime;

    const existingEnd = calculateEndDateTime(
      existingStart,
      appointment.serviceSnapshot.duration,
    );

    if (hasOverlap(newStart, newEnd, existingStart, existingEnd)) {
      return {
        valid: false,
        message: "El odontólogo no está disponible en el horario seleccionado.",
      };
    }
  }

  // =================================================
  // Citas del paciente
  // =================================================

  const patientAppointments = await getActiveAppointments("patient", patient);

  for (const appointment of patientAppointments) {
    if (
      appointmentId &&
      appointment._id.toString() === appointmentId.toString()
    ) {
      continue;
    }

    const existingStart = appointment.dateTime;

    const existingEnd = calculateEndDateTime(
      existingStart,
      appointment.serviceSnapshot.duration,
    );

    if (hasOverlap(newStart, newEnd, existingStart, existingEnd)) {
      return {
        valid: false,
        message: "El paciente ya tiene una cita en el horario seleccionado.",
      };
    }
  }

  return {
    valid: true,
  };
};

/**
 * =====================================================
 * Función auxiliar:
 * Validar horario laboral
 * =====================================================
 *
 * Los horarios del consultorio corresponden a
 * lunes a viernes.
 */
const validateSchedule = async ({ doctor, dateTime, duration }) => {
  const schedule = await Schedule.findOne({
    doctor,
    active: true,
  });

  if (!schedule) {
    return {
      valid: false,
      message: "El odontólogo no tiene un horario laboral activo.",
    };
  }

  // =================================================
  // Verificar día laboral
  // =================================================

  const dayOfWeek = dateTime.getDay();

  // 0 = domingo
  // 1 = lunes
  // 2 = martes
  // 3 = miércoles
  // 4 = jueves
  // 5 = viernes
  // 6 = sábado

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      valid: false,
      message: "No se pueden programar citas los fines de semana.",
    };
  }

  // =================================================
  // Obtener hora y minutos de la cita
  // =================================================

  const appointmentStartMinutes =
    dateTime.getHours() * 60 + dateTime.getMinutes();

  const appointmentEnd = calculateEndDateTime(dateTime, duration);

  const appointmentEndMinutes =
    appointmentEnd.getHours() * 60 + appointmentEnd.getMinutes();

  // =================================================
  // Convertir horario laboral a minutos
  // =================================================

  const [scheduleStartHour, scheduleStartMinute] = schedule.startTime
    .split(":")
    .map(Number);

  const [scheduleEndHour, scheduleEndMinute] = schedule.endTime
    .split(":")
    .map(Number);

  const scheduleStartMinutes = scheduleStartHour * 60 + scheduleStartMinute;

  const scheduleEndMinutes = scheduleEndHour * 60 + scheduleEndMinute;

  // =================================================
  // Verificar que la cita esté completamente dentro
  // del horario laboral
  // =================================================

  if (
    appointmentStartMinutes < scheduleStartMinutes ||
    appointmentEndMinutes > scheduleEndMinutes
  ) {
    return {
      valid: false,
      message: "La cita se encuentra fuera del horario laboral del odontólogo.",
    };
  }

  return {
    valid: true,
  };
};

/**
 * =====================================================
 * Obtener todas las citas
 * =====================================================
 */
export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patient", "name email")
      .populate("doctor", "name email professionalLicense phone")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role")
      .sort({ dateTime: 1 });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener las citas.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Obtener una cita por ID
 * =====================================================
 */
export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "name email")
      .populate("doctor", "name email professionalLicense phone")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role");

    if (!appointment) {
      return res.status(404).json({
        message: "Cita no encontrada.",
      });
    }

    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la cita.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Obtener citas del paciente autenticado
 * =====================================================
 *
 * GET /api/appointments/my
 *
 * Acceso:
 * Paciente
 */
export const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patient: req.user.id,
    })
      .populate("doctor", "name email professionalLicense phone")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role")
      .sort({ dateTime: 1 });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener las citas del paciente.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Obtener citas del odontólogo autenticado
 * =====================================================
 *
 * GET /api/appointments/doctor
 *
 * Acceso:
 * Odontólogo
 */
export const getMyDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.user.id,
    })
      .populate("patient", "name email")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role")
      .sort({ dateTime: 1 });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener las citas del odontólogo.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Crear cita
 * =====================================================
 */
export const createAppointment = async (req, res) => {
  try {
    const { doctor, service, dateTime, notes } = req.body;
    const patient = req.user.id;

    // =================================================
    // Validar campos obligatorios
    // =================================================

    if (!patient || !doctor || !service || !dateTime) {
      return res.status(400).json({
        message:
          "Paciente, odontólogo, servicio y fecha/hora son obligatorios.",
      });
    }

    // =================================================
    // Validar fecha
    // =================================================

    const appointmentDate = new Date(dateTime);

    if (Number.isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        message: "La fecha y hora de la cita no son válidas.",
      });
    }

    // =================================================
    // Validar que la cita sea futura
    // =================================================

    if (appointmentDate <= new Date()) {
      return res.status(400).json({
        message: "La fecha y hora de la cita deben ser futuras.",
      });
    }

    // =================================================
    // Validar paciente
    // =================================================

    const patientExists = await User.findOne({
      _id: patient,
      role: "patient",
      active: true,
    });

    if (!patientExists) {
      return res.status(404).json({
        message:
          "El paciente no existe, no tiene rol de paciente o se encuentra inactivo.",
      });
    }

    // =================================================
    // Validar odontólogo
    // =================================================

    const doctorExists = await User.findOne({
      _id: doctor,
      role: "doctor",
      active: true,
    }).populate("specialty", "name");

    if (!doctorExists) {
      return res.status(404).json({
        message:
          "El odontólogo no existe, no tiene rol de doctor o se encuentra inactivo.",
      });
    }

    // =================================================
    // Validar servicio
    // =================================================

    const serviceExists = await Service.findById(service).populate(
      "specialty",
      "name",
    );

    if (!serviceExists) {
      return res.status(404).json({
        message: "El servicio no existe.",
      });
    }

    if (!serviceExists.active) {
      return res.status(400).json({
        message: "El servicio se encuentra inactivo.",
      });
    }

    // =================================================
    // Validar especialidad
    // =================================================

    if (
      !doctorExists.specialty ||
      !serviceExists.specialty ||
      doctorExists.specialty._id.toString() !==
        serviceExists.specialty._id.toString()
    ) {
      return res.status(400).json({
        message:
          "El servicio seleccionado no pertenece a la especialidad del odontólogo.",
      });
    }

    // =================================================
    // Validar horario laboral
    // =================================================

    const scheduleValidation = await validateSchedule({
      doctor,
      dateTime: appointmentDate,
      duration: serviceExists.duration,
    });

    if (!scheduleValidation.valid) {
      return res.status(400).json({
        message: scheduleValidation.message,
      });
    }

    // =================================================
    // Validar disponibilidad
    // =================================================

    const availabilityValidation = await validateAvailability({
      patient,
      doctor,
      dateTime: appointmentDate,
      duration: serviceExists.duration,
    });

    if (!availabilityValidation.valid) {
      return res.status(409).json({
        message: availabilityValidation.message,
      });
    }

    // =================================================
    // Crear snapshot del servicio
    // =================================================

    const serviceSnapshot = {
      serviceId: serviceExists._id,
      name: serviceExists.name,
      duration: serviceExists.duration,
      price: serviceExists.price,
    };

    // =================================================
    // Crear cita
    // =================================================

    const appointment = await Appointment.create({
      patient,
      doctor,
      service,
      dateTime: appointmentDate,
      status: "confirmed",
      paymentStatus: "pending",
      serviceSnapshot,
      notes: notes || "",
      createdBy: req.user.id,
      lastStatusChangedBy: req.user.id,
    });

    // =================================================
    // Obtener cita completa
    // =================================================

    const appointmentResponse = await Appointment.findById(appointment._id)
      .populate("patient", "name email")
      .populate("doctor", "name email professionalLicense phone")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role");

    res.status(201).json({
      message: "Cita creada correctamente.",
      appointment: appointmentResponse,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear la cita.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Reprogramar cita
 * =====================================================
 */
export const rescheduleAppointment = async (req, res) => {
  try {
    const { dateTime } = req.body;

    if (!dateTime) {
      return res.status(400).json({
        message: "La nueva fecha y hora son obligatorias.",
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        message: "Cita no encontrada.",
      });
    }

    // =================================================
    // Validar propiedad de la cita
    // =================================================

    if (
      req.user.role === "patient" &&
      appointment.patient.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: "No tienes permisos para reprogramar esta cita.",
      });
    }

    // =================================================
    // Solo se pueden reprogramar citas confirmadas
    // =================================================

    if (appointment.status !== "confirmed") {
      return res.status(400).json({
        message: "Solo se pueden reprogramar citas confirmadas.",
      });
    }

    // =================================================
    // Validar nueva fecha
    // =================================================

    const newDateTime = new Date(dateTime);

    if (Number.isNaN(newDateTime.getTime())) {
      return res.status(400).json({
        message: "La nueva fecha y hora no son válidas.",
      });
    }

    if (newDateTime <= new Date()) {
      return res.status(400).json({
        message: "La nueva fecha y hora deben ser futuras.",
      });
    }

    // =================================================
    // Validar horario laboral
    // =================================================

    const scheduleValidation = await validateSchedule({
      doctor: appointment.doctor,
      dateTime: newDateTime,
      duration: appointment.serviceSnapshot.duration,
    });

    if (!scheduleValidation.valid) {
      return res.status(400).json({
        message: scheduleValidation.message,
      });
    }

    // =================================================
    // Validar disponibilidad
    // =================================================

    const availabilityValidation = await validateAvailability({
      patient: appointment.patient,
      doctor: appointment.doctor,
      dateTime: newDateTime,
      duration: appointment.serviceSnapshot.duration,
      appointmentId: appointment._id,
    });

    if (!availabilityValidation.valid) {
      return res.status(409).json({
        message: availabilityValidation.message,
      });
    }

    // =================================================
    // Actualizar fecha/hora
    // =================================================

    appointment.dateTime = newDateTime;

    await appointment.save();

    // =================================================
    // Obtener cita actualizada
    // =================================================

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate("patient", "name email")
      .populate("doctor", "name email professionalLicense phone")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role");

    res.status(200).json({
      message: "Cita reprogramada correctamente.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al reprogramar la cita.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Cancelar cita
 * =====================================================
 */
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        message: "Cita no encontrada.",
      });
    }

    // =================================================
    // Validar propiedad de la cita
    // =================================================

    if (
      req.user.role === "patient" &&
      appointment.patient.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: "No tienes permisos para cancelar esta cita.",
      });
    }

    // =================================================
    // Validar estado
    // =================================================

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        message: "La cita ya se encuentra cancelada.",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        message: "No se puede cancelar una cita completada.",
      });
    }

    if (appointment.status === "no_show") {
      return res.status(400).json({
        message: "No se puede cancelar una cita marcada como no asistida.",
      });
    }

    if (appointment.status === "in_progress") {
      return res.status(400).json({
        message: "No se puede cancelar una cita que se encuentra en curso.",
      });
    }

    // =================================================
    // Validar anticipación de 24 horas
    // =================================================

    const now = new Date();

    const differenceInMilliseconds =
      appointment.dateTime.getTime() - now.getTime();

    const differenceInHours = differenceInMilliseconds / (1000 * 60 * 60);

    if (differenceInHours < 24) {
      return res.status(400).json({
        message:
          "La cita debe cancelarse con un mínimo de 24 horas de anticipación.",
      });
    }

    // =================================================
    // Cancelar
    // =================================================

    appointment.status = "cancelled";
    appointment.lastStatusChangedBy = req.user.id;

    await appointment.save();

    // =================================================
    // Obtener cita actualizada
    // =================================================

    const cancelledAppointment = await Appointment.findById(appointment._id)
      .populate("patient", "name email")
      .populate("doctor", "name email professionalLicense phone")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role");

    res.status(200).json({
      message: "Cita cancelada correctamente.",
      appointment: cancelledAppointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al cancelar la cita.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Cambiar estado de una cita
 * =====================================================
 */
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Estado de cita no válido.",
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        message: "Cita no encontrada.",
      });
    }

    // =================================================
    // Validar propiedad de la cita para odontólogos
    // =================================================

    if (
      req.user.role === "doctor" &&
      appointment.doctor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: "No tienes permisos para modificar el estado de esta cita.",
      });
    }

    // =================================================
    // Validar transición de estados
    // =================================================

    if (appointment.status === "completed") {
      return res.status(400).json({
        message: "Una cita completada no puede cambiar de estado.",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        message: "Una cita cancelada no puede cambiar de estado.",
      });
    }

    if (appointment.status === "no_show") {
      return res.status(400).json({
        message:
          "Una cita marcada como no asistida no puede cambiar de estado.",
      });
    }

    // =================================================
    // Validar flujo de estados
    // =================================================

    const validTransitions = {
      confirmed: ["in_progress", "cancelled", "no_show"],

      in_progress: ["completed"],
    };

    const currentStatus = appointment.status;

    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        message: "La transición de estado no está permitida.",
      });
    }

    // =================================================
    // Actualizar estado
    // =================================================

    appointment.status = status;
    appointment.lastStatusChangedBy = req.user.id;

    await appointment.save();

    // =================================================
    // Obtener cita actualizada
    // =================================================

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate("patient", "name email")
      .populate("doctor", "name email professionalLicense phone")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role");

    res.status(200).json({
      message: "Estado de la cita actualizado correctamente.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el estado de la cita.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Obtener disponibilidad de un odontólogo
 * -----------------------------------------------------
 * Consulta los horarios disponibles para un odontólogo,
 * servicio y fecha determinados.
 *
 * Parámetros:
 * - doctorId
 * - serviceId
 * - date (YYYY-MM-DD)
 *
 * Zona horaria del consultorio:
 * America/Bogota
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */
export const getAppointmentAvailability = async (req, res) => {
  try {
    const { doctorId, serviceId, date } = req.query;

    // =================================================
    // Validar parámetros obligatorios
    // =================================================

    if (!doctorId || !serviceId || !date) {
      return res.status(400).json({
        message: "Los parámetros doctorId, serviceId y date son obligatorios.",
      });
    }

    // =================================================
    // Validar formato de fecha
    // =================================================

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(date)) {
      return res.status(400).json({
        message: "La fecha debe tener el formato YYYY-MM-DD.",
      });
    }

    // =================================================
    // Validar que la fecha exista realmente
    // =================================================

    const [year, month, day] = date.split("-").map(Number);

    const requestedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      requestedDate.getUTCFullYear() !== year ||
      requestedDate.getUTCMonth() !== month - 1 ||
      requestedDate.getUTCDate() !== day
    ) {
      return res.status(400).json({
        message: "La fecha proporcionada no es válida.",
      });
    }

    // =================================================
    // Validar lunes a viernes
    // =================================================

    const dayOfWeek = requestedDate.getUTCDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(200).json({
        date,
        availableSlots: [],
      });
    }

    // =================================================
    // Buscar odontólogo activo
    // =================================================

    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor",
      active: true,
    }).select("name email professionalLicense phone specialty");

    if (!doctor) {
      return res.status(404).json({
        message: "Odontólogo no encontrado o inactivo.",
      });
    }

    // =================================================
    // Buscar servicio activo
    // =================================================

    const service = await Service.findOne({
      _id: serviceId,
      active: true,
    }).select("name duration price specialty");

    if (!service) {
      return res.status(404).json({
        message: "Servicio no encontrado o inactivo.",
      });
    }

    // =================================================
    // Validar especialidad
    // =================================================

    if (doctor.specialty.toString() !== service.specialty.toString()) {
      return res.status(400).json({
        message:
          "El servicio seleccionado no corresponde a la especialidad del odontólogo.",
      });
    }

    // =================================================
    // Buscar horario activo
    // =================================================

    const schedule = await Schedule.findOne({
      doctor: doctor._id,
      active: true,
    });

    if (!schedule) {
      return res.status(404).json({
        message: "El odontólogo no tiene un horario activo.",
      });
    }

    // =================================================
    // Convertir HH:mm a minutos
    // =================================================

    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);

      return hours * 60 + minutes;
    };

    const minutesToTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      return `${String(hours).padStart(2, "0")}:${String(
        remainingMinutes,
      ).padStart(2, "0")}`;
    };

    const scheduleStart = timeToMinutes(schedule.startTime);
    const scheduleEnd = timeToMinutes(schedule.endTime);

    // =================================================
    // Validar duración
    // =================================================

    if (service.duration <= 0) {
      return res.status(400).json({
        message: "La duración del servicio no es válida.",
      });
    }

    // =================================================
    // Crear rango del día en hora local Colombia
    //
    // El rango solicitado es:
    //
    // 00:00 America/Bogota
    // hasta
    // 23:59:59.999 America/Bogota
    //
    // Las citas están almacenadas como UTC.
    // =================================================

    const dayStart = new Date(`${date}T05:00:00.000Z`);

    const nextDayStart = new Date(dayStart);

    nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

    // =================================================
    // Obtener citas que bloquean disponibilidad
    // =================================================

    const appointments = await Appointment.find({
      doctor: doctor._id,
      dateTime: {
        $gte: dayStart,
        $lt: nextDayStart,
      },
      status: {
        $in: ["confirmed", "in_progress"],
      },
    }).select("dateTime serviceSnapshot");

    // =================================================
    // Obtener hora local Colombia desde un Date UTC
    // =================================================

    const getBogotaMinutes = (dateTime) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(dateTime);

      const hour = Number(parts.find((part) => part.type === "hour").value);

      const minute = Number(parts.find((part) => part.type === "minute").value);

      return hour * 60 + minute;
    };

    // =================================================
    // Construir intervalos ocupados
    // =================================================

    const occupiedIntervals = appointments.map((appointment) => {
      const startMinutes = getBogotaMinutes(appointment.dateTime);

      const duration = appointment.serviceSnapshot?.duration || 0;

      return {
        start: startMinutes,
        end: startMinutes + duration,
      };
    });

    // =================================================
    // Generar slots disponibles
    // =================================================

    const availableSlots = [];

    for (
      let slotStart = scheduleStart;
      slotStart + service.duration <= scheduleEnd;
      slotStart += service.duration
    ) {
      const slotEnd = slotStart + service.duration;

      const hasConflict = occupiedIntervals.some(
        (appointment) =>
          slotStart < appointment.end && slotEnd > appointment.start,
      );

      if (!hasConflict) {
        availableSlots.push(minutesToTime(slotStart));
      }
    }

    // =================================================
    // Respuesta
    // =================================================

    res.status(200).json({
      date,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
      },
      service: {
        _id: service._id,
        name: service.name,
        duration: service.duration,
      },
      availableSlots,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la disponibilidad del odontólogo.",
      error: error.message,
    });
  }
};
