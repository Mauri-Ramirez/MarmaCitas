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
 * Proyecto: MarmaCitas
 * =====================================================
 */

// Obtener todos los odontólogos activos
// Acceso: cualquier usuario autenticado
router.get("/", verifyToken, getDoctors);

// Obtener odontólogo por ID
// Acceso: administrador
router.get("/:id", verifyToken, requireRole("admin"), getDoctorById);

// Crear odontólogo
// Acceso: administrador
router.post("/", verifyToken, requireRole("admin"), createDoctor);

// Actualizar odontólogo
// Acceso: administrador
router.put("/:id", verifyToken, requireRole("admin"), updateDoctor);

// Desactivar odontólogo
// Acceso: administrador
router.delete("/:id", verifyToken, requireRole("admin"), deactivateDoctor);

export default router;
