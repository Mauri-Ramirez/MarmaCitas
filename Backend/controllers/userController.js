import User from "../models/User.js";

/**
 * =====================================================
 * Controlador: User
 * -----------------------------------------------------
 * Gestiona las operaciones relacionadas con el perfil
 * del usuario autenticado.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

/**
 * =====================================================
 * Obtener perfil del usuario autenticado
 * =====================================================
 *
 * GET /api/users/me
 *
 * El ID del usuario se obtiene desde el JWT mediante
 * req.user.id.
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("specialty", "name");

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado.",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el perfil.",
      error: error.message,
    });
  }
};

/**
 * =====================================================
 * Actualizar perfil del usuario autenticado
 * =====================================================
 *
 * PUT /api/users/me
 *
 * Por seguridad, el usuario solamente podrá modificar
 * información básica de su propio perfil.
 *
 * El email y los datos profesionales del odontólogo
 * se gestionarán posteriormente mediante reglas
 * específicas.
 */
export const updateMyProfile = async (req, res) => {
  try {
    const { name } = req.body;

    // =================================================
    // Validar nombre
    // =================================================

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "El nombre es obligatorio.",
      });
    }

    // =================================================
    // Buscar usuario autenticado
    // =================================================

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado.",
      });
    }

    // =================================================
    // Actualizar información básica
    // =================================================

    user.name = name.trim();

    await user.save();

    // =================================================
    // Obtener usuario actualizado sin contraseña
    // =================================================

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .populate("specialty", "name");

    res.status(200).json({
      message: "Perfil actualizado correctamente.",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar el perfil.",
      error: error.message,
    });
  }
};
