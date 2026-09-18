import axios from "../api/axios";

export const getServices = async () => {
  const res = await axios.get("/services");

  return res.data;
};

// =====================================================
// CRUD de servicios (administrador)
// =====================================================

export const createService = async (data) => {
  const res = await axios.post("/services", data);

  return res.data;
};

export const updateService = async (serviceId, data) => {
  const res = await axios.put(`/services/${serviceId}`, data);

  return res.data;
};

export const deactivateService = async (serviceId) => {
  const res = await axios.delete(`/services/${serviceId}`);

  return res.data;
};
