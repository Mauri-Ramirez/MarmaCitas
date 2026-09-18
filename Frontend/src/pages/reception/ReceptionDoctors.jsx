import { useEffect, useMemo, useState } from "react";

import { getDoctors } from "../../services/doctorService";
import { getSpecialties } from "../../services/specialtyService";
import { getDoctorSchedule } from "../../services/scheduleService";
import { getAppointments } from "../../services/appointmentService";

const appointmentStatusLabels = {
  confirmed: "Confirmada",
  in_progress: "En atención",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const appointmentStatusTone = (status) => {
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

const formatBogotaTime = (dateTime) =>
  new Date(dateTime).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

const initialsOf = (name) =>
  (name || "")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const getErrorMessage = (error, fallbackMessage) => {
  const backendMessage = error.response?.data?.message;

  return backendMessage || fallbackMessage;
};

function ReceptionDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [noSchedule, setNoSchedule] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [doctorAppointments, setDoctorAppointments] = useState([]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        setLoading(true);
        setListError("");

        const [doctorsData, specialtiesData] = await Promise.all([
          getDoctors(),
          getSpecialties(),
        ]);

        setDoctors(doctorsData);
        setSpecialties(specialtiesData);
      } catch (error) {
        console.error("Error al obtener los odontólogos:", error);

        setDoctors([]);
        setListError(
          getErrorMessage(
            error,
            "No fue posible cargar los odontólogos.",
          ),
        );
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, []);

  const closeDetail = () => {
    setSelectedDoctor(null);
    setSchedule(null);
    setNoSchedule(false);
    setDetailError("");
    setDoctorAppointments([]);
  };

  useEffect(() => {
    if (!selectedDoctor) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDetail();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const loadDoctorData = async (doctorId) => {
    setDetailError("");

    try {
      const data = await getDoctorSchedule(doctorId);

      setSchedule(data);
    } catch (error) {
      if (error.response?.status === 404) {
        setNoSchedule(true);
      } else {
        setDetailError(
          getErrorMessage(
            error,
            "No fue posible cargar el horario.",
          ),
        );
      }
    }

    try {
      const agenda = await getAppointments({
        doctorId,
        date: getBogotaTodayKey(),
        page: "1",
        limit: "5",
      });

      setDoctorAppointments(agenda.appointments || []);
    } catch (error) {
      console.error("Error al obtener la agenda del odontólogo:", error);
    }
  };

  const handleViewDoctor = async (doctor) => {
    setSelectedDoctor(doctor);
    setSchedule(null);
    setNoSchedule(false);
    setDoctorAppointments([]);

    await loadDoctorData(doctor._id);
  };

  // =====================================================
  // Filtros client-side (la lista ya viene completa)
  // =====================================================

  const normalizedSearch = search.trim().toLowerCase();

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const matchesSearch =
        !normalizedSearch ||
        doctor.name?.toLowerCase().includes(normalizedSearch) ||
        doctor.email?.toLowerCase().includes(normalizedSearch);

      const matchesSpecialty =
        !specialtyFilter ||
        doctor.specialty?._id === specialtyFilter;

      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, normalizedSearch, specialtyFilter]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">
          Odontólogos de la clínica
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Odontólogos
        </h1>
      </div>

      {listError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {listError}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <label
              htmlFor="doctor-search"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Nombre o correo
            </label>
            <input
              id="doctor-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o correo"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
          </div>

          <div className="md:w-64">
            <label
              htmlFor="doctor-specialty-filter"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Especialidad
            </label>
            <select
              id="doctor-specialty-filter"
              value={specialtyFilter}
              onChange={(event) =>
                setSpecialtyFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              <option value="">Todas</option>
              {specialties.map((specialty) => (
                <option key={specialty._id} value={specialty._id}>
                  {specialty.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-500">
            {filteredDoctors.length} odontólogo{filteredDoctors.length === 1 ? "" : "s"} activo{filteredDoctors.length === 1 ? "" : "s"}.
          </p>
        </div>

        {loading ? (
          <p className="px-6 py-8 text-sm text-slate-500">
            Cargando odontólogos...
          </p>
        ) : filteredDoctors.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-medium text-slate-700">
              No se encontraron odontólogos con los filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-semibold">Odontólogo</th>
                  <th className="px-4 py-3 font-semibold">Especialidad</th>
                  <th className="px-4 py-3 font-semibold">Licencia</th>
                  <th className="px-4 py-3 font-semibold">Teléfono</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr
                    key={doctor._id}
                    className="border-b last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primaryLight font-title text-sm font-semibold text-primary">
                          {initialsOf(doctor.name)}
                        </span>

                        <div>
                          <p className="font-medium text-slate-800">
                            {doctor.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {doctor.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-primaryLight px-3 py-1 text-xs font-semibold text-primary">
                        {doctor.specialty?.name ?? "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {doctor.professionalLicense ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {doctor.phone || "—"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewDoctor(doctor)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =========================================
          Modal de detalle del odontólogo
      ========================================= */}

      {selectedDoctor && (
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
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-title text-sm font-semibold text-white">
                  {initialsOf(selectedDoctor.name)}
                </div>

                <div>
                  <p className="font-title text-lg font-semibold text-slate-800">
                    {selectedDoctor.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    {selectedDoctor.email}
                  </p>
                </div>
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

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-full bg-primaryLight px-3 py-1 text-xs font-semibold text-primary">
                    {selectedDoctor.specialty?.name ?? "Sin especialidad"}
                  </span>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                    Activo
                  </span>
                </div>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              {detailError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {detailError}
                </div>
              )}

              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Correo electrónico
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedDoctor.email || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Teléfono
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedDoctor.phone || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Licencia profesional
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedDoctor.professionalLicense ?? "—"}
                  </p>
                </div>
              </div>

              {/* Horario */}
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Horario laboral
                </p>

                {noSchedule || !schedule ? (
                  <p className="text-sm text-slate-500">
                    Sin horario activo asignado.
                  </p>
                ) : (
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Jornada
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        Lunes a viernes
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Horario
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {schedule.startTime} — {schedule.endTime}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Pausa
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {schedule.breakStart && schedule.breakEnd
                          ? `${schedule.breakStart} — ${schedule.breakEnd}`
                          : "Sin pausa"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Estado
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {schedule.active ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Agenda de hoy */}
              <div className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-title text-base font-semibold text-slate-800">
                    Agenda de hoy
                  </h3>

                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                    {doctorAppointments.length} cita{doctorAppointments.length === 1 ? "" : "s"}
                  </span>
                </div>

                {doctorAppointments.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Sin citas programadas para hoy.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {doctorAppointments.map((appointment) => (
                      <li key={appointment._id} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-800">
                            {formatBogotaTime(appointment.dateTime)} ·{" "}
                            {appointment.patient?.name ?? "Paciente"}
                          </p>

                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              appointmentStatusTone(appointment.status)
                            }`}
                          >
                            {appointmentStatusLabels[appointment.status] ??
                              appointment.status}
                          </span>
                        </div>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {appointment.serviceSnapshot?.name ??
                            "Servicio no registrado"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceptionDoctors;