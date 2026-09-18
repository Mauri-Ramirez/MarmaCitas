import express from "express";

import {
  createPatient,
  getPatientById,
  getPatients,
  getUsers,
  getMyProfile,
  updateMyProfile,
  updatePatient,
  setUserActive,
} from "../controllers/userController.js";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * =====================================================
 * Rutas: User
 * -----------------------------------------------------
 * Gestiona las operaciones relacionadas con el usuario
 * autenticado.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

/**
 * =====================================================
 * Obtener perfil propio
 * -----------------------------------------------------
 * Acceso:
 * Cualquier usuario autenticado
 * =====================================================
 */

router.get("/me", verifyToken, getMyProfile);

/**
 * =====================================================
 * Actualizar perfil propio
 * -----------------------------------------------------
 * Acceso:
 * Cualquier usuario autenticado
 * =====================================================
 */

router.put("/me", verifyToken, updateMyProfile);

/**
 * =====================================================
 * Gestión administrativa de pacientes
 * -----------------------------------------------------
 * Acceso:
 * Recepción y administrador
 * =====================================================
 */

// Obtener usuarios con filtros (listado general)
// Acceso: administrador
router.get("/", verifyToken, requireRole("admin"), getUsers);

// Activar/desactivar un usuario (gestión administrativa)
// Acceso: administrador
router.patch(
  "/:id/active",
  verifyToken,
  requireRole("admin"),
  setUserActive,
);

router.get(
  "/patients",
  verifyToken,
  requireRole("receptionist", "admin"),
  getPatients,
);

router.get(
  "/patients/:id",
  verifyToken,
  requireRole("receptionist", "admin"),
  getPatientById,
);

// Actualizar datos básicos de un paciente
router.put(
  "/patients/:id",
  verifyToken,
  requireRole("receptionist", "admin"),
  updatePatient,
);

router.post(
  "/patients",
  verifyToken,
  requireRole("receptionist", "admin"),
  createPatient,
);

/**
 * =====================================================
 * Ruta exclusiva para administradores
 * -----------------------------------------------------
 * Se conserva como prueba de autorización de roles.
 * =====================================================
 */

router.get("/admin", verifyToken, requireRole("admin"), (req, res) => {
  res.json({
    message: "Bienvenido administrador",
  });
});

export default router;
