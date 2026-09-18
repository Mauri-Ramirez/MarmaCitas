import axios from "../api/axios";

export const getDoctors = async (params) => {
  const res = await axios.get("/doctors", {
    params,
  });

  return res.data;
};

// =====================================================
// CRUD de odontólogos (administrador)
// =====================================================

export const createDoctor = async (data) => {
  const res = await axios.post("/doctors", data);

  return res.data;
};

export const updateDoctor = async (doctorId, data) => {
  const res = await axios.put(`/doctors/${doctorId}`, data);

  return res.data;
};

export const deactivateDoctor = async (doctorId) => {
  const res = await axios.delete(`/doctors/${doctorId}`);

  return res.data;
};
