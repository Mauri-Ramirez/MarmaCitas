import express from "express";

import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointmentStatus,
} from "../controllers/appointmentController.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";

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

export default router;
