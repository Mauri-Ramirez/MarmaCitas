import axios from "../api/axios";

export const getSpecialties = async () => {
  const res = await axios.get("/specialties");

  return res.data;
};

// =====================================================
// CRUD de especialidades (administrador)
// =====================================================

export const createSpecialty = async (data) => {
  const res = await axios.post("/specialties", data);

  return res.data;
};

export const updateSpecialty = async (specialtyId, data) => {
  const res = await axios.put(`/specialties/${specialtyId}`, data);

  return res.data;
};

export const deactivateSpecialty = async (specialtyId) => {
  const res = await axios.delete(`/specialties/${specialtyId}`);

  return res.data;
};
