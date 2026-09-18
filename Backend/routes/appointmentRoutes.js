import express from "express";

import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointmentStatus,
  updateAppointmentNotes,
  getMyAppointments,
  getMyDoctorAppointments,
  getAppointmentAvailability,
  uploadAppointmentAttachments,
  downloadAppointmentAttachment,
} from "../controllers/appointmentController.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import { uploadAppointmentFiles } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

/**
 * =====================================================
 * Rutas: Appointment
 * -----------------------------------------------------
 * Gestiona las operaciones relacionadas con las citas
 * odontológicas.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

/**
 * =====================================================
 * Consultar citas
 * -----------------------------------------------------
 * Acceso:
 * Administrador
 * Recepcionista
 * =====================================================
 */

// Obtener todas las citas
router.get(
  "/",
  verifyToken,
  requireRole("admin", "receptionist"),
  getAppointments,
);

router.get("/my", verifyToken, requireRole("patient"), getMyAppointments);

router.get(
  "/doctor",
  verifyToken,
  requireRole("doctor"),
  getMyDoctorAppointments,
);

router.get(
  "/availability",
  verifyToken,
  requireRole("patient", "receptionist", "admin"),
  getAppointmentAvailability,
);

// Obtener cita por ID
router.get(
  "/:id",
  verifyToken,
  requireRole("admin", "receptionist"),
  getAppointmentById,
);

/**
 * =====================================================
 * Crear cita
 * -----------------------------------------------------
 * Acceso:
 * Paciente
 * Recepcionista
 * Administrador
 * =====================================================
 */

router.post(
  "/",
  verifyToken,
  requireRole("patient", "receptionist", "admin"),
  createAppointment,
);

/**
 * =====================================================
 * Reprogramar cita
 * -----------------------------------------------------
 * Acceso:
 * Paciente
 * Recepcionista
 * Administrador
 * =====================================================
 */

router.put(
  "/:id/reschedule",
  verifyToken,
  requireRole("patient", "receptionist", "admin"),
  rescheduleAppointment,
);

/**
 * =====================================================
 * Cancelar cita
 * -----------------------------------------------------
 * Acceso:
 * Paciente
 * Recepcionista
 * Administrador
 * =====================================================
 */

router.delete(
  "/:id",
  verifyToken,
  requireRole("patient", "receptionist", "admin"),
  cancelAppointment,
);

/**
 * =====================================================
 * Cambiar estado de cita
 * -----------------------------------------------------
 * Acceso:
 * Odontólogo
 * Recepcionista
 * Administrador
 * =====================================================
 */

router.patch(
  "/:id/status",
  verifyToken,
  requireRole("doctor", "receptionist", "admin"),
  updateAppointmentStatus,
);

/**
 * =====================================================
 * Actualizar notas de atención de una cita
 * -----------------------------------------------------
 * Acceso:
 * Odontólogo (solo citas propias)
 * =====================================================
 */

router.patch(
  "/:id/notes",
  verifyToken,
  requireRole("doctor"),
  updateAppointmentNotes,
);

/**
 * =====================================================
 * Archivos clínicos de una cita
 * -----------------------------------------------------
 * Acceso:
 * Odontólogo (solo citas propias)
 * =====================================================
 */

// Subir archivos (PDF, JPG, JPEG, PNG) a una cita
router.post(
  "/:id/attachments",
  verifyToken,
  requireRole("doctor"),
  uploadAppointmentFiles,
  uploadAppointmentAttachments,
);

// Ver/descargar un archivo adjunto (autenticado)
router.get(
  "/:id/attachments/:attachmentId",
  verifyToken,
  requireRole("doctor"),
  downloadAppointmentAttachment,
);

export default router;
