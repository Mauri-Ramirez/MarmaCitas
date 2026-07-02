import express from "express";

import verifyToken from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Ruta protegida para cualquier usuario autenticado

router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Acceso permitido",

    user: req.user,
  });
});

// Ruta exclusiva para administradores

router.get(
  "/admin",

  verifyToken,

  requireRole("admin"),

  (req, res) => {
    res.json({
      message: "Bienvenido administrador",
    });
  },
);

export default router;
