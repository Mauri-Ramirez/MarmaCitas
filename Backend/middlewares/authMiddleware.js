import jwt from "jsonwebtoken";

import User from "../models/User.js";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(403).json({ message: "Token inválido" });
  }

  // =================================================
  // Autorizar con el estado real del usuario en la BD,
  // no con los claims del token.
  //
  // El token solo certifica identidad (firma y
  // expiración). El rol vigente y el estado activo se
  // leen de la BD en cada request: así una cuenta
  // desactivada o con rol cambiado pierde acceso de
  // inmediato, sin esperar a que expire el token.
  // =================================================

  if (
    !decoded?.id ||
    typeof decoded.id !== "string" ||
    !/^[0-9a-fA-F]{24}$/.test(decoded.id)
  ) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const user = await User.findById(decoded.id).select("role active");

    if (!user || !user.active) {
      return res.status(401).json({
        message: "El usuario se encuentra inactivo o no existe.",
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(500).json({
      message: "Error al validar la sesión.",
      error: error.message,
    });
  }
};

export default verifyToken;
