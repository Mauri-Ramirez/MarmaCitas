import express from "express";

import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deactivateService,
} from "../controllers/serviceController.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * =====================================================
 * Rutas: Service
 * -----------------------------------------------------
 * Gestiona las rutas relacionadas con los servicios
 * odontológicos.
 *
 * Acceso:
 * - Lectura: Usuarios autenticados.
 * - Crear, actualizar y desactivar:
 *   Administrador.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

// Obtener todos los servicios
router.get("/", verifyToken, getServices);

// Obtener un servicio por ID
router.get("/:id", verifyToken, getServiceById);

// Crear servicio
router.post("/", verifyToken, requireRole("admin"), createService);

// Actualizar servicio
router.put("/:id", verifyToken, requireRole("admin"), updateService);

// Desactivar servicio
router.delete("/:id", verifyToken, requireRole("admin"), deactivateService);

export default router;
