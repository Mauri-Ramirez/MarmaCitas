import { useEffect, useMemo, useState } from "react";

import {
  getMyDoctorAppointments,
  updateAppointmentStatus,
  updateAppointmentNotes,
  uploadAppointmentAttachments,
  downloadAppointmentAttachment,
} from "../../services/appointmentService";

const appointmentStatusLabels = {
  confirmed: "Confirmada",
  in_progress: "En atención",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const paymentStatusLabels = {
  pending: "Pendiente",
  paid: "Pagado",
};

const statusTone = (status) => {
  switch (status) {
    case "confirmed":
      return "bg-primaryLight text-primary";
    case "in_progress":
      return "bg-amber-50 text-amber-600";
    case "completed":
      return "bg-emerald-50 text-emerald-600";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    case "no_show":
      return "bg-red-50 text-red-600";
    default:
      return "bg-slate-100 text-slate-500";
  }
};

const paymentTone = (paymentStatus) =>
  paymentStatus === "paid"
    ? "bg-emerald-50 text-emerald-600"
    : "bg-slate-100 text-slate-500";

const filterOptions = [
  { value: "upcoming", label: "Próximas" },
  { value: "today", label: "Hoy" },
  { value: "history", label: "Historial" },
];

const getBogotaDateKey = (date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type) => parts.find((part) => part.type === type).value;

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

const formatBogotaDate = (dateTime) =>
  new Date(dateTime).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatBogotaTime = (dateTime) =>
  new Date(dateTime).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

const formatDayHeader = (dateKey) => {
  const date = new Date(`${dateKey}T12:00:00-05:00`);

  const label = date.toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);

  if (dateKey === getBogotaDateKey(new Date())) {
    return `Hoy · ${capitalized}`;
  }

  return capitalized;
};

const formatBytes = (bytes) => {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB"];

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / 1024 ** index;

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const extensionOf = (filename) => {
  const parts = (filename || "").split(".");

  return parts.length > 1 ? parts.pop().toUpperCase() : "ARCHIVO";
};

function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("upcoming");
  const [updatingAppointment, setUpdatingAppointment] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [notesDrafts, setNotesDrafts] = useState({});
  const [savingNotes, setSavingNotes] = useState(null);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState("");

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getMyDoctorAppointments();

        setAppointments(data);
      } catch (error) {
        console.error("Error al obtener las citas del odontólogo:", error);

        setError(
          error.response?.data?.message ||
            "No fue posible cargar las citas.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const now = new Date();
  const todayKey = getBogotaDateKey(now);

  const sortedAppointments = [...appointments].sort(
    (first, second) =>
      new Date(first.dateTime) - new Date(second.dateTime),
  );

  const filteredAppointments = sortedAppointments.filter((appointment) => {
    const isToday =
      getBogotaDateKey(new Date(appointment.dateTime)) === todayKey;

    const isUpcoming =
      !isToday &&
      ["confirmed", "in_progress"].includes(appointment.status) &&
      new Date(appointment.dateTime) > now;

    if (selectedFilter === "today") {
      return isToday;
    }

    if (selectedFilter === "upcoming") {
      return isUpcoming;
    }

    return !isToday && !isUpcoming;
  });

  // =====================================================
  // Información de paciente estable (no se pierde tras
  // actualizar estado, porque el backend solo devuelve
  // nombre/email en esas respuestas).
  // =====================================================

  const patientsById = useMemo(() => {
    const patientsMap = {};

    for (const appointment of appointments) {
      if (appointment.patient?._id && !patientsMap[appointment.patient._id]) {
        patientsMap[appointment.patient._id] = appointment.patient;
      }
    }

    return patientsMap;
  }, [appointments]);

  const selectedAppointment =
    filteredAppointments.find(
      (appointment) => appointment._id === selectedAppointmentId,
    ) ?? filteredAppointments[0] ?? null;

  const selectedPatient = selectedAppointment?.patient?._id
    ? patientsById[selectedAppointment.patient._id] ??
      selectedAppointment.patient
    : null;

  // =====================================================
  // Atenciones anteriores del paciente (derivadas)
  // =====================================================

  const appointmentHistory = (appointment) => {
    if (!appointment) {
      return [];
    }

    const currentNow = new Date();

    return appointments
      .filter(
        (candidate) =>
          String(candidate.patient?._id) ===
            String(appointment.patient?._id) &&
          candidate._id !== appointment._id,
      )
      .filter(
        (candidate) =>
          candidate.status === "completed" ||
          (["confirmed", "in_progress"].includes(candidate.status) &&
            new Date(candidate.dateTime) < currentNow),
      )
      .sort(
        (first, second) =>
          new Date(second.dateTime) - new Date(first.dateTime),
      )
      .slice(0, 4);
  };

  const groupedAppointments = filteredAppointments.reduce(
    (groups, appointment) => {
      const key = getBogotaDateKey(new Date(appointment.dateTime));

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(appointment);

      return groups;
    },
    {},
  );

  const groupedDates = Object.keys(groupedAppointments).sort();

  // =====================================================
  // Al actualizar estado/notas/archivos, el backend puede
  // devolver el paciente solo con nombre/email. Se
  // conservan los datos clínicos (teléfono, alergias,
  // observaciones) ya cargados en la cita actual.
  // =====================================================

  const mergeUpdatedAppointment = (currentAppointment, updatedAppointment) => {
    if (!updatedAppointment || !currentAppointment) {
      return updatedAppointment;
    }

    const updatedPatient = updatedAppointment.patient;
    const currentPatient = currentAppointment.patient;

    if (!updatedPatient || !currentPatient) {
      return updatedAppointment;
    }

    return {
      ...updatedAppointment,
      patient: {
        ...currentPatient,
        ...updatedPatient,
      },
    };
  };

  const handleStatusUpdate = async (appointment, status, confirmationMessage) => {
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    try {
      setUpdatingAppointment(appointment._id);
      setActionError("");
      setSuccessMessage("");

      const data = await updateAppointmentStatus(appointment._id, status);

      setAppointments((currentAppointments) =>
        currentAppointments.map((currentAppointment) =>
          currentAppointment._id === appointment._id
            ? mergeUpdatedAppointment(
                currentAppointment,
                data.appointment,
              )
            : currentAppointment,
        ),
      );

      setSuccessMessage(
        data.message || "Estado de la cita actualizado correctamente.",
      );
    } catch (error) {
      console.error("Error al actualizar el estado de la cita:", error);

      setActionError(
        error.response?.data?.message ||
          "No fue posible actualizar el estado de la cita.",
      );
    } finally {
      setUpdatingAppointment(null);
    }
  };

  const handleNotesSave = async (appointment) => {
    try {
      setSavingNotes(appointment._id);
      setActionError("");
      setSuccessMessage("");

      const clinicalNotes =
        notesDrafts[appointment._id] ??
        appointment.clinicalNotes ??
        "";

      const data = await updateAppointmentNotes(appointment._id, clinicalNotes);

      setAppointments((currentAppointments) =>
        currentAppointments.map((currentAppointment) =>
          currentAppointment._id === appointment._id
            ? mergeUpdatedAppointment(
                currentAppointment,
                data.appointment,
              )
            : currentAppointment,
        ),
      );

      setNotesDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[appointment._id];
        return nextDrafts;
      });

      setSuccessMessage(
        data.message || "Notas guardadas correctamente.",
      );
    } catch (error) {
      console.error("Error al guardar las notas de la cita:", error);

      setActionError(
        error.response?.data?.message ||
          "No fue posible guardar las notas.",
      );
    } finally {
      setSavingNotes(null);
    }
  };

  const handleAttachmentsUpload = async (appointment, fileList) => {
    const files = Array.from(fileList || []);

    if (files.length === 0) {
      return;
    }

    try {
      setUploadingAttachments(true);
      setAttachmentsError("");
      setActionError("");
      setSuccessMessage("");

      const data = await uploadAppointmentAttachments(
        appointment._id,
        files,
      );

      setAppointments((currentAppointments) =>
        currentAppointments.map((currentAppointment) =>
          currentAppointment._id === appointment._id
            ? mergeUpdatedAppointment(
                currentAppointment,
                data.appointment,
              )
            : currentAppointment,
        ),
      );

      setSuccessMessage(
        data.message || "Archivos adjuntados correctamente.",
      );
    } catch (error) {
      console.error("Error al adjuntar los archivos:", error);

      setAttachmentsError(
        error.response?.data?.message ||
          "No fue posible adjuntar los archivos.",
      );
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleViewAttachment = async (appointment, attachment) => {
    try {
      const blob = await downloadAppointmentAttachment(
        appointment._id,
        attachment._id,
      );

      const url = URL.createObjectURL(blob);

      window.open(url, "_blank", "noopener,noreferrer");

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("Error al abrir el archivo:", error);

      setAttachmentsError(
        error.response?.data?.message ||
          "No fue posible abrir el archivo.",
      );
    }
  };

  if (loading) {
    return <p>Cargando citas...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">
          Agenda y atención de pacientes
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Mis citas
        </h1>
      </div>

      {actionError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {actionError}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      {/* =========================================
          Filtros: Próximas | Hoy | Historial
      ========================================= */}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {filterOptions.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              setSelectedFilter(filter.value);
              setSelectedAppointmentId(null);
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              selectedFilter === filter.value
                ? "bg-primary text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-primary/50 hover:text-primary"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="font-medium text-slate-700">
            No tienes citas registradas.
          </p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="font-medium text-slate-700">
            No hay citas que coincidan con este filtro.
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
          {/* =========================================
              Lista (maestro) agrupada por fecha
          ========================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-3">
              <p className="text-sm font-semibold text-slate-700">Citas</p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {groupedDates.map((dateKey) => (
                <div key={dateKey}>
                  <p className="sticky top-0 border-b border-slate-100 bg-primaryLight/40 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    {formatDayHeader(dateKey)}
                  </p>

                  <ul className="divide-y divide-slate-100">
                    {groupedAppointments[dateKey].map((appointment) => {
                      const isSelected =
                        selectedAppointment?._id === appointment._id;

                      return (
                        <li key={appointment._id}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedAppointmentId(appointment._id)
                            }
                            aria-pressed={isSelected}
                            className={`w-full px-5 py-4 text-left transition ${
                              isSelected
                                ? "bg-primaryLight/50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-title text-base font-semibold text-slate-800">
                                {formatBogotaTime(appointment.dateTime)}
                              </p>

                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                  statusTone(appointment.status)
                                }`}
                              >
                                {appointmentStatusLabels[appointment.status] ||
                                  appointment.status}
                              </span>
                            </div>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {appointment.patient?.name ||
                                "Paciente no registrado"}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {appointment.serviceSnapshot?.name ||
                                "Servicio no registrado"}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* =========================================
              Ficha de atención (detalle)
          ========================================= */}

          {selectedAppointment && (
            <section className="space-y-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                {/* ----- Encabezado: paciente ----- */}

                <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-br from-primaryLight/50 to-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-title text-sm font-semibold text-white">
                      {selectedPatient?.name
                        ? selectedPatient.name
                            .split(" ")
                            .map((part) => part[0])
                            .filter(Boolean)
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "P"}
                    </div>

                    <div>
                      <p className="font-title text-lg font-semibold text-slate-800">
                        {selectedPatient?.name || "Paciente no registrado"}
                      </p>

                      <p className="text-sm text-slate-500">
                        {selectedPatient?.email || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        statusTone(selectedAppointment.status)
                      }`}
                    >
                      {appointmentStatusLabels[selectedAppointment.status] ||
                        selectedAppointment.status}
                    </span>

                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        paymentTone(selectedAppointment.paymentStatus)
                      }`}
                    >
                      {paymentStatusLabels[selectedAppointment.paymentStatus] ||
                        selectedAppointment.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* ----- Información importante ----- */}

                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Teléfono
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {selectedPatient?.phone || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Datos de la cita
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatBogotaDate(selectedAppointment.dateTime)} ·{" "}
                        {formatBogotaTime(selectedAppointment.dateTime)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      className={`rounded-xl px-4 py-3 ${
                        selectedPatient?.allergies
                          ? "border border-amber-200 bg-amber-50"
                          : "bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Alergias
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedPatient?.allergies || "Sin alergias registradas"}
                      </p>
                    </div>

                    <div
                      className={`rounded-xl px-4 py-3 ${
                        selectedPatient?.medicalNotes
                          ? "border border-amber-200 bg-amber-50"
                          : "bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Observaciones médicas
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedPatient?.medicalNotes ||
                          "Sin observaciones registradas"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ----- Datos del servicio ----- */}

                <div className="grid gap-x-6 gap-y-3 border-b border-slate-100 px-6 py-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Servicio
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedAppointment.serviceSnapshot?.name ||
                        "No registrado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Duración
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedAppointment.serviceSnapshot?.duration
                        ? `${selectedAppointment.serviceSnapshot.duration} min`
                        : "No registrada"}
                    </p>
                  </div>
                </div>

                {/* ----- Motivo de consulta ----- */}

                <div className="border-b border-slate-100 px-6 py-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Motivo de consulta
                  </p>

                  <p className="text-sm text-slate-700">
                    {selectedAppointment.reason || "Sin motivo registrado"}
                  </p>
                </div>

                {/* ----- Nota de atención del odontólogo ----- */}

                <div className="border-b border-slate-100 px-6 py-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Nota de atención del odontólogo
                  </p>

                  {selectedAppointment.status === "in_progress" ? (
                    <>
                      <textarea
                        id={`notes-${selectedAppointment._id}`}
                        value={
                          notesDrafts[selectedAppointment._id] ??
                          selectedAppointment.clinicalNotes ??
                          ""
                        }
                        onChange={(e) =>
                          setNotesDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [selectedAppointment._id]: e.target.value,
                          }))
                        }
                        maxLength={2000}
                        rows={4}
                        placeholder="Registra la evolución y procedimientos realizados..."
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleNotesSave(selectedAppointment)}
                        disabled={savingNotes === selectedAppointment._id}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {savingNotes === selectedAppointment._id
                          ? "Guardando..."
                          : "Guardar nota de atención"}
                      </button>
                    </>
                  ) : selectedAppointment.clinicalNotes ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {selectedAppointment.clinicalNotes}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Sin nota de atención registrada.
                    </p>
                  )}
                </div>

                {/* ----- Archivos clínicos ----- */}

                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Archivos clínicos
                    </p>

                    <span className="rounded-full bg-primaryLight px-3 py-1 text-xs font-semibold text-primary">
                      {(selectedAppointment.attachments ?? []).length}/5
                    </span>
                  </div>

                  {attachmentsError && (
                    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {attachmentsError}
                    </div>
                  )}

                  {(selectedAppointment.attachments ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Sin archivos adjuntos.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {(selectedAppointment.attachments ?? []).map(
                        (attachment) => (
                          <li
                            key={attachment._id}
                            className="flex items-center justify-between gap-3 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primaryLight text-[10px] font-bold text-primary">
                                {extensionOf(attachment.filename)}
                              </span>

                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-800">
                                  {attachment.filename}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {formatBytes(attachment.size)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleViewAttachment(
                                  selectedAppointment,
                                  attachment,
                                )
                              }
                              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Ver
                            </button>
                          </li>
                        ),
                      )}
                    </ul>
                  )}

                  {selectedAppointment.status === "in_progress" && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <label
                        htmlFor={`attachments-${selectedAppointment._id}`}
                        className="mb-2 block font-semibold text-slate-700"
                      >
                        Adjuntar archivos
                      </label>

                      <input
                        id={`attachments-${selectedAppointment._id}`}
                        type="file"
                        multiple
                        accept="application/pdf,image/jpeg,image/png"
                        disabled={uploadingAttachments}
                        onChange={(event) => {
                          handleAttachmentsUpload(
                            selectedAppointment,
                            event.target.files,
                          );
                          event.target.value = "";
                        }}
                        className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-50"
                      />

                      <p className="mt-2 text-xs text-slate-400">
                        PDF, JPG, JPEG o PNG. Máximo 5 archivos por cita y 10
                        MB por archivo.
                      </p>
                    </div>
                  )}
                </div>

                {/* ----- Acciones ----- */}

                <div className="px-6 py-5">
                  {selectedAppointment.status === "confirmed" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusUpdate(
                            selectedAppointment,
                            "in_progress",
                            "¿Deseas iniciar la atención de esta cita?",
                          )
                        }
                        disabled={updatingAppointment === selectedAppointment._id}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                      >
                        Iniciar atención
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleStatusUpdate(
                            selectedAppointment,
                            "no_show",
                            "¿Deseas marcar esta cita como no asistió?",
                          )
                        }
                        disabled={updatingAppointment === selectedAppointment._id}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        No asistió
                      </button>
                    </div>
                  )}

                  {selectedAppointment.status === "in_progress" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusUpdate(
                            selectedAppointment,
                            "completed",
                            "¿Deseas finalizar la atención de esta cita?",
                          )
                        }
                        disabled={updatingAppointment === selectedAppointment._id}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Finalizar atención
                      </button>
                    </div>
                  )}

                  {!["confirmed", "in_progress"].includes(
                    selectedAppointment.status,
                  ) && (
                    <p className="text-sm text-slate-500">
                      Esta atención no admite cambios de estado.
                    </p>
                  )}
                </div>
              </div>

              {/* -----------------------------------------
                  Atenciones anteriores
              ----------------------------------------- */}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h2 className="font-title text-lg font-semibold text-slate-800">
                    Atenciones anteriores
                  </h2>
                </div>

                {appointmentHistory(selectedAppointment).length === 0 ? (
                  <div className="px-6 py-6">
                    <p className="text-sm text-slate-500">
                      Sin atenciones previas registradas.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {appointmentHistory(selectedAppointment).map(
                      (historyItem) => (
                        <li key={historyItem._id} className="px-6 py-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-slate-800">
                              {formatBogotaDate(historyItem.dateTime)} ·{" "}
                              {formatBogotaTime(historyItem.dateTime)}
                            </p>

                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                statusTone(historyItem.status)
                              }`}
                            >
                              {appointmentStatusLabels[historyItem.status] ||
                                historyItem.status}
                            </span>
                          </div>

                          <p className="mt-0.5 text-sm text-slate-500">
                            {historyItem.serviceSnapshot?.name ||
                              "Servicio no registrado"}
                          </p>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Motivo de consulta
                              </p>
                              <p className="mt-1 text-sm text-slate-700">
                                {historyItem.reason || "—"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Nota de atención
                              </p>
                              <p className="mt-1 text-sm text-slate-700">
                                {historyItem.clinicalNotes || "—"}
                              </p>
                            </div>
                          </div>

                          {(historyItem.attachments ?? []).length > 0 && (
                            <div className="mt-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Archivos
                              </p>

                              <ul className="flex flex-wrap gap-2">
                                {(historyItem.attachments ?? []).map(
                                  (attachment) => (
                                    <li key={attachment._id}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleViewAttachment(
                                            historyItem,
                                            attachment,
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                      >
                                        <span className="rounded bg-primaryLight px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                          {extensionOf(attachment.filename)}
                                        </span>

                                        <span className="max-w-[12rem] truncate">
                                          {attachment.filename}
                                        </span>

                                        <span className="text-xs text-slate-400">
                                          Ver
                                        </span>
                                      </button>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default DoctorAppointments;