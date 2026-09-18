import { useContext, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { getAppointments } from "../../services/appointmentService";
import { AuthContext } from "../../context/AuthContext";

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

const shiftDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

const formatBogotaTime = (dateTime) =>
  new Date(dateTime).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

const quickActions = [
  {
    to: "/recepcion/citas/agendar",
    title: "Agendar cita",
    description: "Registra una cita para un paciente.",
    accent: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
        <path d="m10 14 1.5 1.5L15 12.5" />
      </svg>
    ),
  },
  {
    to: "/recepcion/pacientes",
    title: "Pacientes",
    description: "Busca, registra y edita pacientes.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21c0-4 3.6-6 7-6s7 2 7 6" />
        <path d="M16 4a4 4 0 0 1 0 8M18 15c2 .8 4 2.2 4 6" />
      </svg>
    ),
  },
  {
    to: "/recepcion/odontologos",
    title: "Odontólogos",
    description: "Consulta los odontólogos activos y sus horarios.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M12 5.5C10 4 7 4 5.5 6.5 4 9 4.5 13 6 16c.8 1.6 1.6 3.5 2.2 3.5.9 0 .8-3 1-5.5.2-1.5 1-2 2.8-2s2.6.5 2.8 2c.2 2.5.1 5.5 1 5.5.6 0 1.4-1.9 2.2-3.5 1.5-3 2-7 .5-9.5C16 4 14 4 12 5.5Z" />
        <path d="M12 5.5c0 1.5-1 2.5-2 3" />
      </svg>
    ),
  },
  {
    to: "/recepcion/perfil",
    title: "Mi perfil",
    description: "Actualiza tu información personal.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
];

function ReceptionDashboard() {
  const { user } = useContext(AuthContext);

  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const today = getBogotaTodayKey();

        const [todayData, upcomingData] = await Promise.all([
          getAppointments({ date: today, limit: 50 }),
          getAppointments({
            dateFrom: shiftDateKey(today, 1),
            dateTo: shiftDateKey(today, 7),
            limit: 5,
          }),
        ]);

        setTodayAppointments(todayData.appointments || []);
        setUpcomingAppointments(upcomingData.appointments || []);
      } catch (loadError) {
        console.error("Error al cargar el panel:", loadError);

        setError(
          loadError.response?.data?.message ||
            "No fue posible cargar la información del día.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const sortedToday = [...todayAppointments].sort(
    (a, b) => new Date(a.dateTime) - new Date(b.dateTime),
  );

  const kpis = {
    total: todayAppointments.length,
    inProgress: todayAppointments.filter(
      (appointment) => appointment.status === "in_progress",
    ).length,
    completed: todayAppointments.filter(
      (appointment) => appointment.status === "completed",
    ).length,
    pendingPayments: todayAppointments.filter(
      (appointment) => appointment.paymentStatus === "pending",
    ).length,
  };

  const currentDate = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const kpiCards = [
    { label: "Citas hoy", value: kpis.total },
    { label: "En atención", value: kpis.inProgress },
    { label: "Completadas", value: kpis.completed },
    { label: "Pagos pendientes", value: kpis.pendingPayments },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          Panel de recepción
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Hola, {user?.name ?? "recepción"}
        </h1>

        <p className="mt-1 capitalize text-slate-500">
          {currentDate}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =========================================
          KPIs del día
      ========================================= */}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
          >
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className="mt-2 font-title text-3xl font-semibold text-slate-800">
              {kpi.value}
            </p>
          </div>
        ))}
      </section>

      {loading ? (
        <p>Cargando información...</p>
      ) : (
        <div className="space-y-8">
          {/* =========================================
              Agenda de hoy (prioridad visual)
          ========================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-title text-lg font-semibold text-slate-800">
                Agenda de hoy
              </h2>

              <div className="flex items-center gap-3">
                <Link
                  to="/recepcion/citas/agendar"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Agendar cita
                </Link>

                <Link
                  to="/recepcion/citas"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todas
                </Link>
              </div>
            </div>

            {sortedToday.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="font-medium text-slate-700">
                  No tienes citas programadas para hoy.
                </p>

                <Link
                  to="/recepcion/citas/agendar"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Agendar la primera cita
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sortedToday.slice(0, 8).map((appointment) => (
                  <li
                    key={appointment._id}
                    className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primaryLight font-title text-sm font-semibold text-primary">
                        {formatBogotaTime(appointment.dateTime)}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {appointment.patient?.name ?? "Paciente no registrado"}
                        </p>

                        <p className="text-sm text-slate-500">
                          {appointment.doctor?.name ?? "Odontólogo"} ·{" "}
                          {appointment.serviceSnapshot?.name ?? "Servicio"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        statusTone(appointment.status)
                      }`}
                    >
                      {appointmentStatusLabels[appointment.status] ??
                        appointment.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* =========================================
              Próximas citas (máx. 5)
          ========================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-title text-lg font-semibold text-slate-800">
                Próximas citas
              </h2>

              <Link
                to="/recepcion/citas"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="px-6 py-8">
                <p className="text-sm text-slate-500">
                  No hay citas próximas.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcomingAppointments.map((appointment) => (
                  <li
                    key={appointment._id}
                    className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {new Date(appointment.dateTime).toLocaleDateString(
                          "es-CO",
                          {
                            timeZone: "America/Bogota",
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          },
                        )}{" "}
                        · {formatBogotaTime(appointment.dateTime)}
                      </p>

                      <p className="mt-0.5 text-sm text-slate-500">
                        {appointment.patient?.name ?? "Paciente"} ·{" "}
                        {appointment.doctor?.name ?? "Odontólogo"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        statusTone(appointment.status)
                      }`}
                    >
                      {appointmentStatusLabels[appointment.status] ??
                        appointment.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* =========================================
              Accesos rápidos
          ========================================= */}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`group flex items-start gap-4 rounded-2xl border p-5 transition hover:shadow-md ${
                  action.accent
                    ? "border-primary/30 bg-primaryLight/40 hover:border-primary"
                    : "border-slate-200 bg-white hover:border-primary/40"
                }`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition ${
                    action.accent
                      ? "bg-primary text-white"
                      : "bg-primaryLight text-primary group-hover:bg-primary group-hover:text-white"
                  }`}
                >
                  {action.icon}
                </span>

                <span>
                  <span className="block font-title font-semibold text-slate-800">
                    {action.title}
                  </span>

                  <span className="mt-1 block text-sm text-slate-500">
                    {action.description}
                  </span>
                </span>
              </Link>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

export default ReceptionDashboard;