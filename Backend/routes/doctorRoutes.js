import express from "express";

import {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deactivateDoctor,
} from "../controllers/doctorController.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * =====================================================
 * Rutas: Doctor
 * -----------------------------------------------------
 * Gestiona las operaciones CRUD de los odontólogos.
 *
 * Acceso:
 * Solo administradores.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

// Obtener todos los odontólogos
router.get("/", verifyToken, requireRole("admin"), getDoctors);

// Obtener odontólogo por ID
router.get("/:id", verifyToken, requireRole("admin"), getDoctorById);

// Crear odontólogo
router.post("/", verifyToken, requireRole("admin"), createDoctor);

// Actualizar odontólogo
router.put("/:id", verifyToken, requireRole("admin"), updateDoctor);

// Desactivar odontólogo (Soft Delete)
router.delete("/:id", verifyToken, requireRole("admin"), deactivateDoctor);

export default router;
