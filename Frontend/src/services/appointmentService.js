import axios from "../api/axios";

// =====================================================
// Obtener citas del paciente autenticado
// =====================================================

export const getMyAppointments = async () => {
  const res = await axios.get("/appointments/my");

  return res.data;
};

// =====================================================
// Obtener citas del odontólogo autenticado
// =====================================================

export const getMyDoctorAppointments = async () => {
  const res = await axios.get("/appointments/doctor");

  return res.data;
};

export const updateAppointmentStatus = async (appointmentId, status) => {
  const res = await axios.patch(`/appointments/${appointmentId}/status`, {
    status,
  });

  return res.data;
};

// =====================================================
// Obtener disponibilidad de un odontólogo
// -----------------------------------------------------
// Parámetros:
// - doctorId
// - serviceId
// - date: YYYY-MM-DD
// =====================================================

export const getAppointmentAvailability = async ({
  doctorId,
  serviceId,
  date,
}) => {
  const res = await axios.get("/appointments/availability", {
    params: {
      doctorId,
      serviceId,
      date,
    },
  });

  return res.data;
};

export const createAppointment = async (data) => {
  const res = await axios.post("/appointments", data);

  return res.data;
};

export const cancelAppointment = async (appointmentId) => {
  const res = await axios.delete(`/appointments/${appointmentId}`);

  return res.data;
};

export const rescheduleAppointment = async (appointmentId, dateTime) => {
  const res = await axios.put(`/appointments/${appointmentId}/reschedule`, {
    dateTime,
  });

  return res.data;
};
