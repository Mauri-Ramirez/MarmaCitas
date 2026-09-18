import axios from "../api/axios";

export const getPatients = async ({ search, page, limit }) => {
  const res = await axios.get("/users/patients", {
    params: {
      search,
      page,
      limit,
    },
  });

  return res.data;
};

export const getPatientById = async (id) => {
  const res = await axios.get(`/users/patients/${id}`);

  return res.data;
};

export const createPatient = async (data) => {
  const res = await axios.post("/users/patients", data);

  return res.data;
};

// =====================================================
// Actualizar datos básicos de un paciente
// (recepción y administrador)
// =====================================================

export const updatePatient = async (id, data) => {
  const res = await axios.put(`/users/patients/${id}`, data);

  return res.data;
};
