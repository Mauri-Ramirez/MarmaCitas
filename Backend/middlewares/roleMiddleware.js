const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // verifyToken ya dejó el usuario en req.user
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "No tienes permisos para acceder a este recurso.",
      });
    }

    next();
  };
};

export default requireRole;
