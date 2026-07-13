import express from "express";

import {
  getSpecialties,
  getSpecialtyById,
  createSpecialty,
  updateSpecialty,
  deactivateSpecialty,
} from "../controllers/specialtyController.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * =====================================================
 * Rutas: Specialty
 * -----------------------------------------------------
 * Gestiona las rutas relacionadas con las especialidades.
 *
 * Acceso:
 * - Lectura: Usuarios autenticados.
 * - Crear, actualizar y desactivar:
 *   Administrador.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

// Obtener todas las especialidades
router.get("/", verifyToken, getSpecialties);

// Obtener una especialidad por ID
router.get("/:id", verifyToken, getSpecialtyById);

// Crear especialidad
router.post("/", verifyToken, requireRole("admin"), createSpecialty);

// Actualizar especialidad
router.put("/:id", verifyToken, requireRole("admin"), updateSpecialty);

// Desactivar especialidad
router.delete("/:id", verifyToken, requireRole("admin"), deactivateSpecialty);

export default router;
