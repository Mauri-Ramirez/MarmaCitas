import express from "express";

import {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deactivateSchedule,
} from "../controllers/scheduleController.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * =====================================================
 * Rutas: Schedule
 * -----------------------------------------------------
 * Gestiona las operaciones CRUD de los horarios
 * laborales de los odontólogos.
 *
 * Acceso:
 * Solo administradores.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

// Obtener todos los horarios
router.get("/", verifyToken, requireRole("admin"), getSchedules);

// Obtener horario por ID
router.get("/:id", verifyToken, requireRole("admin"), getScheduleById);

// Crear horario
router.post("/", verifyToken, requireRole("admin"), createSchedule);

// Actualizar horario
router.put("/:id", verifyToken, requireRole("admin"), updateSchedule);

// Desactivar horario (Soft Delete)
router.delete("/:id", verifyToken, requireRole("admin"), deactivateSchedule);

export default router;
