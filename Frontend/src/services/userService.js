import axios from "../api/axios";

export const getMyProfile = async () => {
  const res = await axios.get("/users/me");

  return res.data;
};

export const updateMyProfile = async (data) => {
  const res = await axios.put("/users/me", data);

  return res.data;
};

// =====================================================
// Obtener usuarios con filtros (administrador)
// -----------------------------------------------------
// Parámetros opcionales:
// - role: patient | doctor | receptionist | admin
// - search: nombre o correo
// - page, limit (1 a 50)
// =====================================================

export const getUsers = async (params) => {
  const res = await axios.get("/users", {
    params,
  });

  return res.data;
};

// =====================================================
// Activar/desactivar un usuario (administrador)
// =====================================================

export const setUserActive = async (userId, active) => {
  const res = await axios.patch(`/users/${userId}/active`, { active });

  return res.data;
};
