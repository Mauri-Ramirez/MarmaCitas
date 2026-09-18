import { useContext, useEffect, useState } from "react";

import { AuthContext } from "../../context/AuthContext";
import { getMyDoctorAppointments } from "../../services/appointmentService";

const appointmentStatusLabels = {
  confirmed: "Confirmada",
  in_progress: "En atención",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
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

const formatBogotaTime = (dateTime) =>
  new Date(dateTime).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

const formatBogotaDateTime = (dateTime) =>
  new Date(dateTime).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

function DoctorDashboard() {
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const todayAppointments = appointments.filter(
    (appointment) =>
      getBogotaDateKey(new Date(appointment.dateTime)) === todayKey,
  );

  const confirmedAppointments = todayAppointments.filter(
    (appointment) => appointment.status === "confirmed",
  );

  const inProgressAppointments = todayAppointments.filter(
    (appointment) => appointment.status === "in_progress",
  );

  const agendaToday = sortedAppointments
    .filter(
      (appointment) =>
        getBogotaDateKey(new Date(appointment.dateTime)) === todayKey &&
        ["confirmed", "in_progress"].includes(appointment.status),
    )
    .slice(0, 5);

  const upcomingAppointments = sortedAppointments
    .filter(
      (appointment) =>
        ["confirmed", "in_progress"].includes(appointment.status) &&
        new Date(appointment.dateTime) > now &&
        getBogotaDateKey(new Date(appointment.dateTime)) !== todayKey,
    )
    .slice(0, 5);

  const currentDate = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  if (loading) {
    return <p>Cargando información...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          Panel del odontólogo
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Buenos días, {user?.name || "odontólogo"}
        </h1>

        <p className="mt-1 capitalize text-slate-500">
          {currentDate}
        </p>
      </div>

      {/* =========================================
          Métricas del día
      ========================================= */}

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-slate-500">Citas de hoy</p>
          <p className="mt-2 font-title text-3xl font-semibold text-slate-800">
            {todayAppointments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-slate-500">Confirmadas</p>
          <p className="mt-2 font-title text-3xl font-semibold text-slate-800">
            {confirmedAppointments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-slate-500">En atención</p>
          <p className="mt-2 font-title text-3xl font-semibold text-slate-800">
            {inProgressAppointments.length}
          </p>
        </div>
      </section>

      {/* =========================================
          Agenda de hoy
      ========================================= */}

      <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-title text-lg font-semibold text-slate-800">
            Agenda de hoy
          </h2>
        </div>

        {appointments.length === 0 ? (
          <div className="px-6 py-8">
            <p className="text-sm text-slate-500">
              No tienes citas registradas.
            </p>
          </div>
        ) : agendaToday.length === 0 ? (
          <div className="px-6 py-8">
            <p className="text-sm text-slate-500">
              No tienes citas programadas para hoy.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {agendaToday.map((appointment) => (
              <li
                key={appointment._id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primaryLight text-primary">
                    <span className="font-title text-sm font-semibold leading-none">
                      {formatBogotaTime(appointment.dateTime)}
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800">
                      {appointment.patient?.name || "Paciente no registrado"}
                    </p>

                    <p className="text-sm text-slate-500">
                      {appointment.serviceSnapshot?.name || "Servicio no registrado"}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    statusTone(appointment.status)
                  }`}
                >
                  {appointmentStatusLabels[appointment.status] ||
                    appointment.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* =========================================
          Próximas citas
      ========================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-title text-lg font-semibold text-slate-800">
            Próximas citas
          </h2>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="px-6 py-8">
            <p className="text-sm text-slate-500">
              No tienes citas próximas.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingAppointments.map((appointment) => (
              <li
                key={appointment._id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {formatBogotaDateTime(appointment.dateTime)}
                  </p>

                  <p className="mt-0.5 text-sm text-slate-500">
                    {appointment.patient?.name || "Paciente no registrado"} ·{" "}
                    {appointment.serviceSnapshot?.name || "Servicio no registrado"}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    statusTone(appointment.status)
                  }`}
                >
                  {appointmentStatusLabels[appointment.status] ||
                    appointment.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default DoctorDashboard;