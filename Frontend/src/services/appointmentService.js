import axios from "../api/axios";

// =====================================================
// Obtener citas con filtros y paginación
// (administración y recepción)
// -----------------------------------------------------
// Parámetros opcionales:
// - date: YYYY-MM-DD (no combinable con dateFrom/dateTo)
// - dateFrom / dateTo: YYYY-MM-DD (rango máximo 31 días)
// - doctorId, patientId, serviceId
// - status, paymentStatus
// - search: nombre o correo del paciente
// - page, limit (1 a 50)
// =====================================================

export const getAppointments = async (params) => {
  const res = await axios.get("/appointments", {
    params,
  });

  return res.data;
};

// =====================================================
// Obtener una cita por ID (administración y recepción)
// =====================================================

export const getAppointmentById = async (appointmentId) => {
  const res = await axios.get(`/appointments/${appointmentId}`);

  return res.data;
};

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
// Actualizar nota de atención de una cita
// (odontólogo, solo citas propias)
// =====================================================

export const updateAppointmentNotes = async (appointmentId, clinicalNotes) => {
  const res = await axios.patch(`/appointments/${appointmentId}/notes`, {
    clinicalNotes,
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

// =====================================================
// Adjuntar archivos clínicos a una cita
// (odontólogo, solo citas propias y en atención)
// =====================================================

export const uploadAppointmentAttachments = async (appointmentId, files) => {
  const formData = new FormData();

  files.forEach((file) => formData.append("files", file));

  const res = await axios.post(
    `/appointments/${appointmentId}/attachments`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return res.data;
};

// =====================================================
// Descargar/visualizar un archivo clínico de una cita
// (odontólogo, solo citas propias; acceso autenticado)
// =====================================================

export const downloadAppointmentAttachment = async (
  appointmentId,
  attachmentId,
) => {
  const res = await axios.get(
    `/appointments/${appointmentId}/attachments/${attachmentId}`,
    { responseType: "blob" },
  );

  return res.data;
};
