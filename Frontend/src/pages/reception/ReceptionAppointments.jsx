import { Fragment, useCallback, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
  cancelAppointment,
  getAppointmentById,
  getAppointments,
  rescheduleAppointment,
  updateAppointmentStatus,
} from "../../services/appointmentService";
import { getDoctors } from "../../services/doctorService";

const PAGE_LIMIT = 10;

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

const rangeOptions = [
  { value: "today", label: "Hoy" },
  { value: "upcoming", label: "Próximas" },
  { value: "history", label: "Historial" },
];

const getBogotaTodayKey = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (type) => parts.find((part) => part.type === type).value;

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

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

const shiftDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
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

  if (dateKey === getBogotaTodayKey()) {
    return `Hoy · ${capitalized}`;
  }

  return capitalized;
};

const getErrorMessage = (error, fallbackMessage) => {
  const status = error.response?.status;
  const backendMessage = error.response?.data?.message;

  if (status === 403) {
    return "No tienes permisos para realizar esta acción.";
  }

  if (status === 404) {
    return "Cita no encontrada.";
  }

  return backendMessage || fallbackMessage;
};

const buildQueryParams = (tab, { doctorId, search }, page) => {
  const params = { page, limit: PAGE_LIMIT };

  const today = getBogotaTodayKey();

  if (tab === "today") {
    params.date = today;
  } else if (tab === "upcoming") {
    params.dateFrom = shiftDateKey(today, 1);
    params.dateTo = shiftDateKey(today, 30);
  } else {
    params.dateFrom = shiftDateKey(today, -30);
    params.dateTo = shiftDateKey(today, -1);
  }

  if (doctorId) {
    params.doctorId = doctorId;
  }

  if (search) {
    params.search = search;
  }

  return params;
};

function ReceptionAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [doctors, setDoctors] = useState([]);

  const [activeTab, setActiveTab] = useState("today");
  const [filterDoctorId, setFilterDoctorId] = useState("");
  const [search, setSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    tab: "today",
    doctorId: "",
    search: "",
  });

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [actionLoading, setActionLoading] = useState(null);
  const [detailActionError, setDetailActionError] = useState("");
  const [detailActionSuccess, setDetailActionSuccess] = useState("");

  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const loadAppointments = useCallback(async (page, filters) => {
    try {
      setLoading(true);
      setListError("");

      const data = await getAppointments(
        buildQueryParams(filters.tab, filters, page),
      );

      setAppointments(data.appointments || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error al obtener las citas:", error);

      setAppointments([]);
      setListError(
        getErrorMessage(error, "No fue posible cargar las citas."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const data = await getDoctors();

        setDoctors(data);
      } catch (error) {
        console.error("Error al obtener los odontólogos:", error);
      }
    };

    loadDoctors();

    const initialLoad = window.setTimeout(() => {
      loadAppointments(1, { tab: "today", doctorId: "", search: "" });
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadAppointments]);

  const closeDetail = () => {
    setSelectedAppointment(null);
    setDetailError("");
    setDetailActionError("");
    setDetailActionSuccess("");
    setRescheduleId(null);
    setRescheduleDate("");
    setRescheduleTime("");
  };

  useEffect(() => {
    if (!selectedAppointment) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDetail();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAppointment]);

  const handleTabChange = async (tab) => {
    const filters = { tab, doctorId: filterDoctorId, search: search.trim() };

    setActiveTab(tab);
    setAppliedFilters(filters);
    setSelectedAppointment(null);
    setDetailError("");

    await loadAppointments(1, filters);
  };

  const handleApplyFilters = async (event) => {
    event.preventDefault();

    const filters = { tab: activeTab, doctorId: filterDoctorId, search: search.trim() };

    setAppliedFilters(filters);
    setSelectedAppointment(null);
    setDetailError("");

    await loadAppointments(1, filters);
  };

  const handleClearFilters = async () => {
    setFilterDoctorId("");
    setSearch("");

    const filters = { tab: activeTab, doctorId: "", search: "" };

    setAppliedFilters(filters);
    setSelectedAppointment(null);
    setDetailError("");

    await loadAppointments(1, filters);
  };

  const handlePageChange = async (page) => {
    if (page < 1 || page > pagination.pages || loading) {
      return;
    }

    setSelectedAppointment(null);
    setDetailError("");

    await loadAppointments(page, appliedFilters);
  };

  const handleViewAppointment = async (appointmentId) => {
    try {
      setDetailLoading(true);
      setDetailError("");
      setSelectedAppointment(null);
      setActionLoading(null);
      setDetailActionError("");
      setDetailActionSuccess("");
      setRescheduleId(null);
      setRescheduleDate("");
      setRescheduleTime("");

      const data = await getAppointmentById(appointmentId);

      setSelectedAppointment(data);
    } catch (error) {
      console.error("Error al obtener la cita:", error);

      setDetailError(
        getErrorMessage(
          error,
          "No fue posible cargar la información de la cita.",
        ),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // =====================================================
  // Acciones sobre la cita seleccionada
  // =====================================================

  const refreshAfterAction = async (updatedAppointment) => {
    setSelectedAppointment(updatedAppointment);

    await loadAppointments(pagination.page, appliedFilters);
  };

  const handleCancelAppointment = async (appointment) => {
    if (!window.confirm("¿Deseas cancelar esta cita?")) {
      return;
    }

    try {
      setActionLoading(appointment._id);
      setDetailActionError("");
      setDetailActionSuccess("");

      const data = await cancelAppointment(appointment._id);

      setDetailActionSuccess(
        data.message || "Cita cancelada correctamente.",
      );

      await refreshAfterAction(data.appointment);
    } catch (error) {
      console.error("Error al cancelar la cita:", error);

      setDetailActionError(
        getErrorMessage(error, "No fue posible cancelar la cita."),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoShowAppointment = async (appointment) => {
    if (!window.confirm("¿Deseas marcar esta cita como no asistió?")) {
      return;
    }

    try {
      setActionLoading(appointment._id);
      setDetailActionError("");
      setDetailActionSuccess("");

      const data = await updateAppointmentStatus(
        appointment._id,
        "no_show",
      );

      setDetailActionSuccess(
        data.message || "Estado de la cita actualizado correctamente.",
      );

      await refreshAfterAction(data.appointment);
    } catch (error) {
      console.error("Error al actualizar el estado de la cita:", error);

      setDetailActionError(
        getErrorMessage(
          error,
          "No fue posible actualizar el estado de la cita.",
        ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartReschedule = (appointment) => {
    setRescheduleId(appointment._id);
    setRescheduleDate("");
    setRescheduleTime("");
    setDetailActionError("");
    setDetailActionSuccess("");
  };

  const handleCancelReschedule = () => {
    setRescheduleId(null);
    setRescheduleDate("");
    setRescheduleTime("");
  };

  const handleConfirmReschedule = async (appointment) => {
    if (!rescheduleDate || !rescheduleTime) {
      setDetailActionError("Selecciona la nueva fecha y hora.");
      return;
    }

    try {
      setActionLoading(appointment._id);
      setDetailActionError("");
      setDetailActionSuccess("");

      const dateTime = new Date(
        `${rescheduleDate}T${rescheduleTime}:00-05:00`,
      ).toISOString();

      const data = await rescheduleAppointment(appointment._id, dateTime);

      setDetailActionSuccess(
        data.message || "Cita reprogramada correctamente.",
      );

      setRescheduleId(null);
      setRescheduleDate("");
      setRescheduleTime("");

      await refreshAfterAction(data.appointment);
    } catch (error) {
      console.error("Error al reprogramar la cita:", error);

      setDetailActionError(
        getErrorMessage(error, "No fue posible reprogramar la cita."),
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // Agrupar listado por fecha
  // =====================================================

  const groupedAppointments = appointments.reduce((groups, appointment) => {
    const key = getBogotaDateKey(new Date(appointment.dateTime));

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(appointment);

    return groups;
  }, {});

  const groupedDates = Object.keys(groupedAppointments).sort();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            Agenda de la clínica
          </p>

          <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
            Citas
          </h1>
        </div>

        <Link
          to="/recepcion/citas/agendar"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          Agendar cita
        </Link>
      </div>

      {listError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {listError}
        </div>
      )}

      {/* =========================================
          Tabs + búsqueda + filtro odontólogo
      ========================================= */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleTabChange(option.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                activeTab === option.value
                  ? "bg-primary text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-primary/50 hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleApplyFilters}
          className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 md:flex-row md:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="filter-search"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Paciente
            </label>
            <input
              id="filter-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre o correo del paciente"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              disabled={loading}
            />
          </div>

          <div className="md:w-56">
            <label
              htmlFor="filter-doctor"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Odontólogo
            </label>
            <select
              id="filter-doctor"
              value={filterDoctorId}
              onChange={(event) => setFilterDoctorId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              disabled={loading}
            >
              <option value="">Todos</option>
              {doctors.map((doctor) => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              Buscar
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {/* =========================================
          Listado agrupado por fecha
      ========================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-500">
            {pagination.total} cita{pagination.total === 1 ? "" : "s"}
            encontrada{pagination.total === 1 ? "" : "s"}.
          </p>
        </div>

        {loading ? (
          <p className="px-6 py-8 text-sm text-slate-500">Cargando citas...</p>
        ) : appointments.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-medium text-slate-700">
              No se encontraron citas con los filtros aplicados.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-semibold">Hora</th>
                    <th className="px-4 py-3 font-semibold">Paciente</th>
                    <th className="px-4 py-3 font-semibold">Odontólogo</th>
                    <th className="px-4 py-3 font-semibold">Servicio</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Pago</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedDates.map((dateKey) => (
                    <Fragment key={dateKey}>
                      <tr className="border-b bg-primaryLight/30">
                        <td
                          colSpan={7}
                          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary"
                        >
                          {formatDayHeader(dateKey)}
                        </td>
                      </tr>

                      {groupedAppointments[dateKey].map((appointment) => (
                        <tr
                          key={appointment._id}
                          className="border-b last:border-b-0 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {formatBogotaTime(appointment.dateTime)}
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">
                              {appointment.patient?.name ?? "—"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {appointment.patient?.email ?? ""}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {appointment.doctor?.name ?? "—"}
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {appointment.serviceSnapshot?.name ?? "—"}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                statusTone(appointment.status)
                              }`}
                            >
                              {appointmentStatusLabels[appointment.status] ??
                                appointment.status}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                paymentTone(appointment.paymentStatus)
                              }`}
                            >
                              {paymentStatusLabels[
                                appointment.paymentStatus
                              ] ?? appointment.paymentStatus}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleViewAppointment(appointment._id)
                              }
                              disabled={detailLoading}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Anterior
                </button>

                <p className="text-sm text-slate-500">
                  Página {pagination.page} de {pagination.pages}
                </p>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || loading}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* =========================================
          Modal de detalle
      ========================================= */}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <p className="rounded-2xl bg-white px-6 py-4 text-sm font-medium text-slate-700">
            Cargando información de la cita...
          </p>
        </div>
      )}

      {detailError && !selectedAppointment && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {detailError}
        </div>
      )}

      {selectedAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
          onClick={closeDetail}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-primaryLight/50 to-white px-6 py-5">
              <div>
                <p className="font-title text-lg font-semibold text-slate-800">
                  {selectedAppointment.patient?.name ?? "Paciente"}
                </p>

                <p className="text-sm text-slate-500">
                  {formatBogotaDate(selectedAppointment.dateTime)} ·{" "}
                  {formatBogotaTime(selectedAppointment.dateTime)}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={closeDetail}
                  aria-label="Cerrar"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>

                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    statusTone(selectedAppointment.status)
                  }`}
                >
                  {appointmentStatusLabels[selectedAppointment.status] ??
                    selectedAppointment.status}
                </span>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Paciente
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedAppointment.patient?.name ?? "—"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedAppointment.patient?.email ?? ""}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Odontólogo
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedAppointment.doctor?.name ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Servicio
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedAppointment.serviceSnapshot?.name ?? "—"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedAppointment.serviceSnapshot?.duration ?? "—"} min · $
                    {selectedAppointment.serviceSnapshot?.price ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Pago
                  </p>
                  <p className="mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        paymentTone(selectedAppointment.paymentStatus)
                      }`}
                    >
                      {paymentStatusLabels[selectedAppointment.paymentStatus] ??
                        selectedAppointment.paymentStatus}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Motivo de consulta
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedAppointment.reason || "—"}
                </p>
              </div>

              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Creada por
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedAppointment.createdBy?.name ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Último cambio de estado por
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedAppointment.lastStatusChangedBy?.name ?? "—"}
                  </p>
                </div>
              </div>

              {detailActionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {detailActionError}
                </div>
              )}

              {detailActionSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {detailActionSuccess}
                </div>
              )}

              {selectedAppointment.status === "confirmed" && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCancelAppointment(selectedAppointment)}
                      disabled={actionLoading === selectedAppointment._id}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {actionLoading === selectedAppointment._id
                        ? "Procesando..."
                        : "Cancelar cita"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartReschedule(selectedAppointment)}
                      disabled={actionLoading === selectedAppointment._id}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                    >
                      Reprogramar cita
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNoShowAppointment(selectedAppointment)}
                      disabled={actionLoading === selectedAppointment._id}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      No asistió
                    </button>
                  </div>

                  {rescheduleId === selectedAppointment._id && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-primaryLight/30 p-4">
                      <h3 className="mb-3 font-semibold text-slate-800">
                        Nueva fecha y hora
                      </h3>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor="reschedule-date"
                            className="mb-2 block font-semibold text-slate-700"
                          >
                            Nueva fecha
                          </label>

                          <input
                            id="reschedule-date"
                            type="date"
                            value={rescheduleDate}
                            onChange={(event) =>
                              setRescheduleDate(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="reschedule-time"
                            className="mb-2 block font-semibold text-slate-700"
                          >
                            Nueva hora
                          </label>

                          <input
                            id="reschedule-time"
                            type="time"
                            value={rescheduleTime}
                            onChange={(event) =>
                              setRescheduleTime(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                          />
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-500">
                        La cita debe reprogramarse a una fecha futura, dentro
                        del horario laboral del odontólogo y sin conflictos
                        con otras citas.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleConfirmReschedule(selectedAppointment)
                          }
                          disabled={actionLoading === selectedAppointment._id}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                        >
                          {actionLoading === selectedAppointment._id
                            ? "Reprogramando..."
                            : "Confirmar reprogramación"}
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelReschedule}
                          disabled={actionLoading === selectedAppointment._id}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancelar cambio
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceptionAppointments;