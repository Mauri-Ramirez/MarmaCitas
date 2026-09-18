import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Schedule from "../models/Schedule.js";
import {
  buildDoctorSegmentsMinutes,
  intersectMinutesSegments,
  CLINIC_SEGMENTS_MINUTES,
} from "../config/clinicSchedule.js";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import {
  cleanupUploadedFiles,
  getUploadsDir,
} from "../middlewares/uploadMiddleware.js";

/**
 * =====================================================
 * Error funcional con código HTTP asociado.
 * -----------------------------------------------------
 * Permite abortar una transacción desde el callback con
 * un error de dominio y responder el status correcto
 * fuera de ella.
 * =====================================================
 */
const httpError = (statusCode, message) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

/**
 * =====================================================
 * Función auxiliar:
 * Obtener día de la semana, hora y minutos de un Date
 * en la zona horaria America/Bogota.
 * -----------------------------------------------------
 * La validación de jornada no debe depender de la zona
 * horaria del proceso Node.
 * =====================================================
 */
export const getBogotaParts = (dateTime) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(dateTime);

  const getPart = (type) => parts.find((part) => part.type === type).value;

  const weekdayToNumber = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dayOfWeek: weekdayToNumber[getPart("weekday")],
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
  };
};

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

// =====================================================
// Guarda temporal de atención:
//
// in_progress solo procede cuando la hora de la cita ya
// llegó (con tolerancia de 15 minutos); no_show solo a
// partir de la hora exacta de la cita.
// completed queda cubierto porque exige in_progress.
// cancelled no se restringe para pacientes, recepción y
// admin (el odontólogo no puede cancelar).
// =====================================================

const earlyAttentionToleranceMinutes = 15;

// =====================================================
// Cadencia fija de los inicios de slot en la
// disponibilidad, independiente de la duración del
// servicio: la duración solo define la longitud de la
// cita y el recorte final dentro del horario laboral.
// =====================================================

const availabilitySlotStepMinutes = 15;

const appointmentStatuses = [
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
];

const paymentStatuses = ["pending", "paid"];

const appointmentListQueryParams = new Set([
  "date",
  "dateFrom",
  "dateTo",
  "doctorId",
  "patientId",
  "serviceId",
  "status",
  "paymentStatus",
  "search",
  "page",
  "limit",
]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseCalendarDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const getBogotaDayStart = (date) => new Date(`${date}T05:00:00.000Z`);

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
const getActiveAppointments = async (field, userId, session = null) => {
  return Appointment.find({
    [field]: userId,
    status: { $in: activeAppointmentStatuses },
  })
    .select("dateTime serviceSnapshot status")
    .session(session);
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
  session = null,
}) => {
  const newStart = dateTime;
  const newEnd = calculateEndDateTime(dateTime, duration);

  // =================================================
  // Citas del odontólogo
  // =================================================

  const doctorAppointments = await getActiveAppointments(
    "doctor",
    doctor,
    session,
  );

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

  const patientAppointments = await getActiveAppointments(
    "patient",
    patient,
    session,
  );

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
const validateSchedule = async ({
  doctor,
  dateTime,
  duration,
  session = null,
}) => {
  const schedule = await Schedule.findOne({
    doctor,
    active: true,
  }).session(session);

  if (!schedule) {
    return {
      valid: false,
      message: "El odontólogo no tiene un horario laboral activo.",
    };
  }

  // =================================================
  // Verificar día laboral (America/Bogota)
  // =================================================

  const { dayOfWeek, hour, minute } = getBogotaParts(dateTime);

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
  // Obtener hora y minutos de la cita (America/Bogota)
  // =================================================

  const appointmentStartMinutes = hour * 60 + minute;

  const appointmentEnd = calculateEndDateTime(dateTime, duration);

  const endParts = getBogotaParts(appointmentEnd);

  const appointmentEndMinutes = endParts.hour * 60 + endParts.minute;

  // =================================================
  // Construir tramos de la jornada.
  //
  // Los tramos del odontólogo (horario propio y pausa)
  // se intersectan con la jornada fija de la clínica.
  // Así, aunque el horario registrado no defina pausa,
  // la jornada efectiva respeta la clínica
  // (08:00-12:00 y 14:00-17:00).
  // =================================================

  const scheduleSegments = buildDoctorSegmentsMinutes(schedule);

  const segments = intersectMinutesSegments(
    scheduleSegments,
    CLINIC_SEGMENTS_MINUTES,
  );

  // =================================================
  // Verificar que la cita esté completamente dentro
  // de uno de los tramos de la jornada efectiva
  // =================================================

  const fitsInSegment = segments.some(
    (segment) =>
      appointmentStartMinutes >= segment.start &&
      appointmentEndMinutes <= segment.end,
  );

  if (!fitsInSegment) {
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
    const unknownQueryParam = Object.keys(req.query).find(
      (param) => !appointmentListQueryParams.has(param),
    );

    if (unknownQueryParam) {
      return res.status(400).json({
        message: `El parámetro ${unknownQueryParam} no está permitido.`,
      });
    }

    const {
      date,
      dateFrom,
      dateTo,
      doctorId,
      patientId,
      serviceId,
      status,
      paymentStatus,
      search,
      page = "1",
      limit = "20",
    } = req.query;

    if (date !== undefined && (dateFrom !== undefined || dateTo !== undefined)) {
      return res.status(400).json({
        message: "date no puede combinarse con dateFrom o dateTo.",
      });
    }

    if (
      (dateFrom !== undefined && dateTo === undefined) ||
      (dateFrom === undefined && dateTo !== undefined)
    ) {
      return res.status(400).json({
        message: "dateFrom y dateTo deben enviarse juntos.",
      });
    }

    if (
      typeof page !== "string" ||
      typeof limit !== "string" ||
      !/^\d+$/.test(page) ||
      !/^\d+$/.test(limit)
    ) {
      return res.status(400).json({
        message: "page y limit deben ser enteros positivos.",
      });
    }

    const currentPage = Number(page);
    const currentLimit = Number(limit);

    if (
      !Number.isSafeInteger(currentPage) ||
      !Number.isSafeInteger(currentLimit) ||
      currentPage < 1 ||
      currentLimit < 1 ||
      currentLimit > 50
    ) {
      return res.status(400).json({
        message: "page debe ser mayor o igual a 1 y limit debe estar entre 1 y 50.",
      });
    }

    const query = {};

    if (date !== undefined) {
      const parsedDate = parseCalendarDate(date);

      if (!parsedDate) {
        return res.status(400).json({
          message: "date debe tener el formato YYYY-MM-DD y ser una fecha válida.",
        });
      }

      const dayStart = getBogotaDayStart(date);
      const nextDayStart = new Date(dayStart);

      nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

      query.dateTime = {
        $gte: dayStart,
        $lt: nextDayStart,
      };
    }

    if (dateFrom !== undefined && dateTo !== undefined) {
      const parsedDateFrom = parseCalendarDate(dateFrom);
      const parsedDateTo = parseCalendarDate(dateTo);

      if (!parsedDateFrom || !parsedDateTo) {
        return res.status(400).json({
          message:
            "dateFrom y dateTo deben tener el formato YYYY-MM-DD y ser fechas válidas.",
        });
      }

      if (parsedDateFrom > parsedDateTo) {
        return res.status(400).json({
          message: "dateFrom no puede ser posterior a dateTo.",
        });
      }

      const rangeInDays =
        (parsedDateTo.getTime() - parsedDateFrom.getTime()) /
          (1000 * 60 * 60 * 24) +
        1;

      if (rangeInDays > 31) {
        return res.status(400).json({
          message: "El rango de fechas no puede superar 31 días.",
        });
      }

      const rangeStart = getBogotaDayStart(dateFrom);
      const rangeEnd = getBogotaDayStart(dateTo);

      rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

      query.dateTime = {
        $gte: rangeStart,
        $lt: rangeEnd,
      };
    }

    const idFilters = [
      ["doctor", doctorId],
      ["patient", patientId],
      ["service", serviceId],
    ];

    for (const [field, value] of idFilters) {
      if (value !== undefined) {
        if (typeof value !== "string" || !mongoose.isValidObjectId(value)) {
          return res.status(400).json({
            message: `El identificador de ${field} no es válido.`,
          });
        }

        query[field] = value;
      }
    }

    if (status !== undefined) {
      if (typeof status !== "string" || !appointmentStatuses.includes(status)) {
        return res.status(400).json({
          message: "El estado de la cita no es válido.",
        });
      }

      query.status = status;
    }

    if (paymentStatus !== undefined) {
      if (
        typeof paymentStatus !== "string" ||
        !paymentStatuses.includes(paymentStatus)
      ) {
        return res.status(400).json({
          message: "El estado de pago no es válido.",
        });
      }

      query.paymentStatus = paymentStatus;
    }

    if (search !== undefined) {
      if (typeof search !== "string" || search.length > 100) {
        return res.status(400).json({
          message: "search debe ser un texto de máximo 100 caracteres.",
        });
      }

      const normalizedSearch = search.trim();

      if (normalizedSearch) {
        const searchRegex = new RegExp(escapeRegex(normalizedSearch), "i");
        const patients = await User.find({
          role: "patient",
          $or: [{ name: searchRegex }, { email: searchRegex }],
        }).select("_id");

        const patientIds = patients.map((patient) => patient._id);

        if (query.patient) {
          query.patient = {
            $in: patientIds.filter(
              (id) => id.equals(query.patient),
            ),
          };
        } else {
          query.patient = { $in: patientIds };
        }
      }
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .select("patient doctor serviceSnapshot dateTime status paymentStatus reason")
        .populate("patient", "name email")
        .populate("doctor", "name")
        .sort({ dateTime: 1, _id: 1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      Appointment.countDocuments(query),
    ]);

    res.status(200).json({
      appointments,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        pages: Math.ceil(total / currentLimit),
      },
    });
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
      .select("-clinicalNotes -attachments")
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
      .populate(
        "patient",
        "name email phone allergies medicalNotes",
      )
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
    const { patientId, doctor, service, dateTime, reason, notes } = req.body;
    let patient = req.user.id;

    // =================================================
    // Determinar paciente según el rol autenticado
    // =================================================

    if (req.user.role === "receptionist" || req.user.role === "admin") {
      if (!patientId) {
        return res.status(400).json({
          message: "El identificador del paciente es obligatorio.",
        });
      }

      if (!mongoose.isValidObjectId(patientId)) {
        return res.status(400).json({
          message: "El identificador del paciente no es válido.",
        });
      }

      patient = patientId;
    }

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
    // Crear la cita dentro de una transacción.
    //
    // La escritura de appointmentLockVersion en los
    // documentos User del odontólogo y del paciente
    // serializa las operaciones concurrentes que
    // compartan alguno de los dos actores: si dos
    // transacciones incrementan el mismo documento,
    // una sufre un write conflict, se reintenta con un
    // snapshot nuevo y en ese reintento detecta la cita
    // ya creada por la ganadora.
    //
    // Las escrituras se realizan en orden determinista
    // por _id para evitar deadlocks. Dentro del callback
    // no se envían respuestas ni se ejecutan efectos
    // externos, porque el driver puede reejecutarlo.
    // =================================================

    // =================================================
    // Identificador de la cita creada; se asigna dentro
    // de la transacción y se usa después del commit.
    // =================================================

    let createdAppointmentId = null;

    await mongoose.connection.transaction(async (session) => {
      // ===============================================
      // Adquirir locks en orden determinista
      // ===============================================

      const lockOwners = [
        { id: String(doctor), role: "doctor" },
        { id: String(patient), role: "patient" },
      ].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

      for (const owner of lockOwners) {
        const lockResult = await User.updateOne(
          {
            _id: owner.id,
            role: owner.role,
            active: true,
          },
          { $inc: { appointmentLockVersion: 1 } },
          { session, timestamps: false },
        );

        if (lockResult.matchedCount === 0) {
          if (owner.role === "patient") {
            throw httpError(
              404,
              "El paciente no existe, no tiene rol de paciente o se encuentra inactivo.",
            );
          }

          throw httpError(
            404,
            "El odontólogo no existe, no tiene rol de doctor o se encuentra inactivo.",
          );
        }
      }

      // ===============================================
      // Revalidar paciente dentro de la transacción
      // ===============================================

      const patientExists = await User.findOne({
        _id: patient,
        role: "patient",
        active: true,
      }).session(session);

      if (!patientExists) {
        throw httpError(
          404,
          "El paciente no existe, no tiene rol de paciente o se encuentra inactivo.",
        );
      }

      // ===============================================
      // Revalidar odontólogo dentro de la transacción
      // ===============================================

      const doctorExists = await User.findOne({
        _id: doctor,
        role: "doctor",
        active: true,
      })
        .populate("specialty", "name")
        .session(session);

      if (!doctorExists) {
        throw httpError(
          404,
          "El odontólogo no existe, no tiene rol de doctor o se encuentra inactivo.",
        );
      }

      // ===============================================
      // Revalidar servicio dentro de la transacción
      // ===============================================

      const serviceExists = await Service.findById(service)
        .populate("specialty", "name")
        .session(session);

      if (!serviceExists) {
        throw httpError(404, "El servicio no existe.");
      }

      if (!serviceExists.active) {
        throw httpError(400, "El servicio se encuentra inactivo.");
      }

      // ===============================================
      // Validar especialidad
      // ===============================================

      if (
        !doctorExists.specialty ||
        !serviceExists.specialty ||
        doctorExists.specialty._id.toString() !==
          serviceExists.specialty._id.toString()
      ) {
        throw httpError(
          400,
          "El servicio seleccionado no pertenece a la especialidad del odontólogo.",
        );
      }

      // ===============================================
      // Validar horario laboral
      // ===============================================

      const scheduleValidation = await validateSchedule({
        doctor,
        dateTime: appointmentDate,
        duration: serviceExists.duration,
        session,
      });

      if (!scheduleValidation.valid) {
        throw httpError(400, scheduleValidation.message);
      }

      // ===============================================
      // Validar disponibilidad
      // ===============================================

      const availabilityValidation = await validateAvailability({
        patient,
        doctor,
        dateTime: appointmentDate,
        duration: serviceExists.duration,
        session,
      });

      if (!availabilityValidation.valid) {
        throw httpError(409, availabilityValidation.message);
      }

      // ===============================================
      // Crear snapshot del servicio
      // ===============================================

      const serviceSnapshot = {
        serviceId: serviceExists._id,
        name: serviceExists.name,
        duration: serviceExists.duration,
        price: serviceExists.price,
      };

      // ===============================================
      // Crear cita dentro de la transacción.
      //
      // En Mongoose 9 la sesión se aplica a Model.create()
      // únicamente cuando el primer argumento es un array.
      // ===============================================

      const [appointment] = await Appointment.create(
        [
          {
            patient,
            doctor,
            service,
            dateTime: appointmentDate,
            status: "confirmed",
            paymentStatus: "pending",
            serviceSnapshot,
            reason: (reason ?? notes) || "",
            createdBy: req.user.id,
            lastStatusChangedBy: req.user.id,
          },
        ],
        { session },
      );

      createdAppointmentId = appointment._id;
    });

    // =================================================
    // Obtener cita completa (fuera de la transacción)
    // =================================================

    const appointmentResponse = await Appointment.findById(
      createdAppointmentId,
    )
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
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

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
    // Capturar la versión esperada de la cita antes de
    // iniciar la transacción.
    //
    // Esa versión debe mantenerse estable durante todos
    // los reintentos de la transacción: si otra operación
    // modifica la cita concurrentemente, el reintento
    // detectará el cambio y responderá 409 en lugar de
    // reprogramar sobre estado obsoleto.
    // =================================================

    const expectedVersion = appointment.__v;

    // =================================================
    // Solo se pueden reprogramar citas confirmadas
    // =================================================

    if (appointment.status !== "confirmed") {
      return res.status(400).json({
        message: "Solo se pueden reprogramar citas confirmadas.",
      });
    }

    // =================================================
    // La cita original debe seguir siendo futura.
    // =================================================

    if (appointment.dateTime <= new Date()) {
      return res.status(400).json({
        message: "La cita original ya pasó y no puede reprogramarse.",
      });
    }

    // =================================================
    // El paciente no puede usar la reprogramación para
    // eludir la regla de cancelación de 24 horas.
    // =================================================

    if (
      req.user.role === "patient" &&
      appointment.dateTime.getTime() - new Date().getTime() <
        24 * 60 * 60 * 1000
    ) {
      return res.status(400).json({
        message:
          "Solo se pueden reprogramar citas con al menos 24 horas de anticipación.",
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
    // Reprogramar dentro de una transacción.
    //
    // Igual que en la creación: los locks de
    // appointmentLockVersion sobre el odontólogo y el
    // paciente de la cita serializan las operaciones
    // concurrentes, y la releer con _id + __v + estado
    // confirmado garantiza no trabajar sobre una cita
    // modificada o cancelada por otra operación.
    // =================================================

    await mongoose.connection.transaction(async (session) => {
      // ===============================================
      // Adquirir locks en orden determinista
      // ===============================================

      const lockOwners = [
        { id: String(appointment.doctor), role: "doctor" },
        { id: String(appointment.patient), role: "patient" },
      ].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

      for (const owner of lockOwners) {
        const lockResult = await User.updateOne(
          {
            _id: owner.id,
            role: owner.role,
            active: true,
          },
          { $inc: { appointmentLockVersion: 1 } },
          { session, timestamps: false },
        );

        if (lockResult.matchedCount === 0) {
          if (owner.role === "patient") {
            throw httpError(
              404,
              "El paciente no existe, no tiene rol de paciente o se encuentra inactivo.",
            );
          }

          throw httpError(
            404,
            "El odontólogo no existe, no tiene rol de doctor o se encuentra inactivo.",
          );
        }
      }

      // ===============================================
      // Releer la cita dentro de la transacción
      // exigiendo la versión esperada y estado confirmado
      // ===============================================

      const currentAppointment = await Appointment.findOne({
        _id: appointment._id,
        __v: expectedVersion,
        status: "confirmed",
      }).session(session);

      if (!currentAppointment) {
        throw httpError(
          409,
          "La cita fue modificada por otra operación. Actualiza e intenta nuevamente.",
        );
      }

      // ===============================================
      // Validar horario laboral
      // ===============================================

      const scheduleValidation = await validateSchedule({
        doctor: currentAppointment.doctor,
        dateTime: newDateTime,
        duration: currentAppointment.serviceSnapshot.duration,
        session,
      });

      if (!scheduleValidation.valid) {
        throw httpError(400, scheduleValidation.message);
      }

      // ===============================================
      // Validar disponibilidad excluyendo la propia cita
      // ===============================================

      const availabilityValidation = await validateAvailability({
        patient: currentAppointment.patient,
        doctor: currentAppointment.doctor,
        dateTime: newDateTime,
        duration: currentAppointment.serviceSnapshot.duration,
        appointmentId: currentAppointment._id,
        session,
      });

      if (!availabilityValidation.valid) {
        throw httpError(409, availabilityValidation.message);
      }

      // ===============================================
      // Actualizar fecha/hora con control optimista
      // ===============================================

      currentAppointment.dateTime = newDateTime;

      await currentAppointment.save({ session });
    });

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
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    if (error.name === "VersionError") {
      return res.status(409).json({
        message:
          "La cita fue modificada por otra operación. Actualiza e intenta nuevamente.",
      });
    }

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
    //
    // Solo aplica al paciente: recepción y admin pueden
    // cancelar aunque falten menos de 24 horas.
    // =================================================

    if (req.user.role === "patient") {
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
    if (error.name === "VersionError") {
      return res.status(409).json({
        message:
          "La cita fue modificada por otra operación. Actualiza e intenta nuevamente.",
      });
    }

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

    const currentStatus = appointment.status;

    // =================================================
    // El odontólogo NO puede cancelar citas.
    // =================================================

    if (status === "cancelled" && req.user.role === "doctor") {
      return res.status(400).json({
        message: "El odontólogo no puede cancelar citas.",
      });
    }

    const validTransitions = {
      confirmed: ["in_progress", "cancelled", "no_show"],

      in_progress: ["completed"],
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        message: "La transición de estado no está permitida.",
      });
    }

    // =================================================
    // Guarda temporal:
    // - in_progress admite hasta 15 minutos de
    //   anticipación.
    // - no_show solo a partir de la hora exacta de la
    //   cita (sin tolerancia).
    // =================================================

    if (status === "in_progress") {
      const earliestAllowed = new Date(
        appointment.dateTime.getTime() -
          earlyAttentionToleranceMinutes * 60 * 1000,
      );

      if (new Date() < earliestAllowed) {
        return res.status(400).json({
          message:
            "No se puede iniciar la atención antes de la fecha y hora de la cita (se permiten hasta 15 minutos de anticipación).",
        });
      }
    } else if (status === "no_show") {
      if (new Date() < appointment.dateTime) {
        return res.status(400).json({
          message:
            "No se puede marcar no_show antes de la hora de la cita.",
        });
      }
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
    if (error.name === "VersionError") {
      return res.status(409).json({
        message:
          "La cita fue modificada por otra operación. Actualiza e intenta nuevamente.",
      });
    }

    res.status(500).json({
      message: "Error al actualizar el estado de la cita.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Actualizar notas de atención de una cita
 * =====================================================
 *
 * PATCH /api/appointments/:id/notes
 *
 * Acceso:
 * Odontólogo (solo citas propias)
 */
export const updateAppointmentNotes = async (req, res) => {
  try {
    const { clinicalNotes, notes } = req.body;

    // =================================================
    // Validar notas
    // =================================================

    const noteValue = clinicalNotes ?? notes;

    if (typeof noteValue !== "string") {
      return res.status(400).json({
        message: "Las notas deben ser un texto.",
      });
    }

    const normalizedNotes = noteValue.trim();

    if (normalizedNotes.length > 2000) {
      return res.status(400).json({
        message: "Las notas no pueden superar los 2000 caracteres.",
      });
    }

    // =================================================
    // Buscar la cita
    // =================================================

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        message: "Cita no encontrada.",
      });
    }

    // =================================================
    // Validar propiedad de la cita para odontólogos
    // =================================================

    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        message: "No tienes permisos para modificar las notas de esta cita.",
      });
    }

    // =================================================
    // La nota clínica solo puede crearse/modificarse
    // mientras la cita está en atención. Al pasar a
    // completed (o en confirmed/cancelled/no_show) queda
    // cerrada.
    // =================================================

    if (appointment.status !== "in_progress") {
      return res.status(400).json({
        message:
          "Solo se pueden modificar las notas de atención mientras la cita está en atención.",
      });
    }

    // =================================================
    // Actualizar nota de atención del odontólogo
    // =================================================

    appointment.clinicalNotes = normalizedNotes;

    await appointment.save();

    // =================================================
    // Obtener cita actualizada
    // =================================================

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate(
        "patient",
        "name email phone allergies medicalNotes",
      )
      .populate("doctor", "name email professionalLicense phone")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role");

    res.status(200).json({
      message: "Notas de la cita actualizadas correctamente.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    if (error.name === "VersionError") {
      return res.status(409).json({
        message:
          "La cita fue modificada por otra operación. Actualiza e intenta nuevamente.",
      });
    }

    res.status(500).json({
      message: "Error al actualizar las notas de la cita.",
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

    const minutesToTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      return `${String(hours).padStart(2, "0")}:${String(
        remainingMinutes,
      ).padStart(2, "0")}`;
    };

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
    // Construir tramos de la jornada.
    //
    // Los tramos del odontólogo (horario propio y pausa)
    // se intersectan con la jornada fija de la clínica.
    // Así, aunque el horario registrado no defina pausa,
    // la jornada efectiva respeta la clínica
    // (08:00-12:00 y 14:00-17:00).
    // =================================================

    const segments = intersectMinutesSegments(
      buildDoctorSegmentsMinutes(schedule),
      CLINIC_SEGMENTS_MINUTES,
    );

    // =================================================
    // Generar slots disponibles
    //
    // Los inicios candidatos siguen una cadencia fija de
    // 15 minutos independiente de la duración del servicio.
    // Los slots cuya hora ya pasó se omiten; Colombia no
    // tiene DST, por lo que el offset fijo -05:00 es exacto.
    // =================================================

    const now = new Date();

    const availableSlots = [];

    for (const segment of segments) {
      for (
        let slotStart = segment.start;
        slotStart + service.duration <= segment.end;
        slotStart += availabilitySlotStepMinutes
      ) {
        const slotEnd = slotStart + service.duration;

        const slotTime = minutesToTime(slotStart);

        const slotDateTime = new Date(
          `${date}T${slotTime}:00-05:00`,
        );

        if (slotDateTime <= now) {
          continue;
        }

        const hasConflict = occupiedIntervals.some(
          (appointment) =>
            slotStart < appointment.end && slotEnd > appointment.start,
        );

        if (!hasConflict) {
          availableSlots.push(slotTime);
        }
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

/**
 * =====================================================
 * Adjuntar archivos clínicos a una cita
 * -----------------------------------------------------
 * POST /api/appointments/:id/attachments
 *
 * Acceso:
 * Odontólogo (solo citas propias)
 *
 * Solo se pueden adjuntar archivos a una cita en
 * atención (in_progress). Máximo 5 archivos por cita.
 * =====================================================
 */
export const uploadAppointmentAttachments = async (req, res) => {
  const files = req.files || [];

  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      await cleanupUploadedFiles(files);

      return res.status(404).json({
        message: "Cita no encontrada.",
      });
    }

    // =================================================
    // Validar propiedad de la cita para odontólogos
    // =================================================

    if (appointment.doctor.toString() !== req.user.id) {
      await cleanupUploadedFiles(files);

      return res.status(403).json({
        message: "No tienes permisos para adjuntar archivos a esta cita.",
      });
    }

    // =================================================
    // Validar estado de la cita
    // =================================================

    if (appointment.status !== "in_progress") {
      await cleanupUploadedFiles(files);

      return res.status(400).json({
        message: "Solo se pueden adjuntar archivos a una cita en atención.",
      });
    }

    // =================================================
    // Validar límite total de archivos por cita
    // =================================================

    const existingCount = appointment.attachments?.length ?? 0;

    if (existingCount + files.length > 5) {
      await cleanupUploadedFiles(files);

      return res.status(400).json({
        message: "Máximo 5 archivos por cita.",
      });
    }

    // =================================================
    // Guardar metadatos
    // =================================================

    const attachments = files.map((file) => ({
      filename: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: req.user.id,
    }));

    appointment.attachments.push(...attachments);

    await appointment.save();

    // =================================================
    // Obtener cita actualizada
    // =================================================

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate(
        "patient",
        "name email phone allergies medicalNotes",
      )
      .populate("doctor", "name email professionalLicense phone")
      .populate("service", "name description duration price specialty")
      .populate("createdBy", "name email role")
      .populate("lastStatusChangedBy", "name email role");

    res.status(201).json({
      message: "Archivos adjuntados correctamente.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    await cleanupUploadedFiles(files);

    res.status(500).json({
      message: "Error al adjuntar los archivos.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Descargar/visualizar un archivo clínico de una cita
 * -----------------------------------------------------
 * GET /api/appointments/:id/attachments/:attachmentId
 *
 * Acceso:
 * Odontólogo (solo citas propias)
 *
 * Los archivos clínicos no se sirven de forma pública:
 * siempre se requiere autenticación y propiedad.
 * =====================================================
 */
export const downloadAppointmentAttachment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        message: "Cita no encontrada.",
      });
    }

    // =================================================
    // Validar propiedad de la cita para odontólogos
    // =================================================

    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        message: "No tienes permisos para acceder a los archivos de esta cita.",
      });
    }

    const attachment = appointment.attachments.find(
      (item) => item._id.toString() === req.params.attachmentId,
    );

    if (!attachment) {
      return res.status(404).json({
        message: "Archivo no encontrado.",
      });
    }

    const filePath = path.join(
      getUploadsDir(),
      attachment.storedName,
    );

    try {
      await fs.promises.access(filePath);
    } catch (accessError) {
      return res.status(404).json({
        message: "El archivo no se encuentra disponible.",
      });
    }

    res.setHeader("Content-Type", attachment.mimeType);

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${attachment.filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
    );

    const stream = fs.createReadStream(filePath);

    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Error al leer el archivo.",
        });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el archivo.",
      error: error.message,
    });
  }
};
