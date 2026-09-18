import axios from "../api/axios";

export const getMySchedule = async () => {
  const res = await axios.get("/schedules/my");

  return res.data;
};

// =====================================================
// Obtener horario activo de un odontólogo por ID
// (recepción y administrador)
// =====================================================

export const getDoctorSchedule = async (doctorId) => {
  const res = await axios.get(`/schedules/doctor/${doctorId}`);

  return res.data;
};

// =====================================================
// CRUD de horarios (administrador)
// =====================================================

export const createSchedule = async (data) => {
  const res = await axios.post("/schedules", data);

  return res.data;
};

export const updateSchedule = async (scheduleId, data) => {
  const res = await axios.put(`/schedules/${scheduleId}`, data);

  return res.data;
};

export const deactivateSchedule = async (scheduleId) => {
  const res = await axios.delete(`/schedules/${scheduleId}`);

  return res.data;
};
