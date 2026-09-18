import { useContext, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { AuthContext } from "../../context/AuthContext";
import { getPatients } from "../../services/patientService";
import { getDoctors } from "../../services/doctorService";
import { getSpecialties } from "../../services/specialtyService";
import { getServices } from "../../services/serviceService";
import { getAppointments } from "../../services/appointmentService";

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

const quickActions = [
  {
    to: "/admin/catalogo",
    title: "Catálogo",
    description: "Gestiona especialidades y servicios.",
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
        <path d="M4 6h16M4 12h16M4 18h16" />
        <path d="M8 8v2M12 8v2M8 14v2M12 14v2" />
      </svg>
    ),
  },
  {
    to: "/admin/odontologos",
    title: "Odontólogos",
    description: "Gestiona odontólogos, especialidades y horarios.",
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
  {
    to: "/admin/usuarios",
    title: "Usuarios",
    description: "Consulta los usuarios de la clínica con filtros.",
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
    to: "/admin/citas",
    title: "Citas",
    description: "Consulta el listado general de citas con filtros.",
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
      </svg>
    ),
  },
  {
    to: "/admin/perfil",
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

function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    patients: null,
    doctors: null,
    specialties: null,
    services: null,
    appointmentsTotal: null,
    appointmentsToday: null,
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError("");

        const todayKey = getBogotaTodayKey();

        const [
          patientsResult,
          doctorsResult,
          specialtiesResult,
          servicesResult,
          appointmentsResult,
          todayResult,
        ] = await Promise.allSettled([
          getPatients({ page: 1, limit: 1 }),
          getDoctors(),
          getSpecialties(),
          getServices(),
          getAppointments({ page: 1, limit: 1 }),
          getAppointments({ date: todayKey, page: 1, limit: 50 }),
        ]);

        const totalFrom = (result, fallback) =>
          result.status === "fulfilled"
            ? result.value.pagination?.total ??
              result.value.length ??
              fallback
            : fallback;

        setStats({
          patients: totalFrom(patientsResult, null),
          doctors: totalFrom(doctorsResult, null),
          specialties: totalFrom(specialtiesResult, null),
          services: totalFrom(servicesResult, null),
          appointmentsTotal: totalFrom(appointmentsResult, null),
          appointmentsToday: totalFrom(todayResult, null),
        });

        setTodayAppointments(
          todayResult.status === "fulfilled"
            ? todayResult.value.appointments || []
            : [],
        );

        if (
          [
            patientsResult,
            doctorsResult,
            specialtiesResult,
            servicesResult,
            appointmentsResult,
            todayResult,
          ].some((result) => result.status === "rejected")
        ) {
          setError(
            "Algunas estadísticas no pudieron cargarse; se muestran como —.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    { label: "Pacientes", value: stats.patients },
    { label: "Odontólogos activos", value: stats.doctors },
    { label: "Especialidades activas", value: stats.specialties },
    { label: "Servicios activos", value: stats.services },
    { label: "Citas totales", value: stats.appointmentsTotal },
    { label: "Citas de hoy", value: stats.appointmentsToday },
  ];

  const inProgressToday = todayAppointments.filter(
    (appointment) => appointment.status === "in_progress",
  ).length;

  const pendingPaymentsToday = todayAppointments.filter(
    (appointment) => appointment.paymentStatus === "pending",
  ).length;

  const sortedToday = [...todayAppointments].sort(
    (a, b) => new Date(a.dateTime) - new Date(b.dateTime),
  );

  const secondaryKpis = [
    { label: "En atención hoy", value: inProgressToday },
    { label: "Pagos pendientes hoy", value: pendingPaymentsToday },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          Panel de administración
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Hola, {user?.name ?? "administrador"}
        </h1>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p>Cargando estadísticas...</p>
      ) : (
        <div className="space-y-8">
          {/* =========================================
              Estadísticas principales
          ========================================= */}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
              >
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 font-title text-3xl font-semibold text-slate-800">
                  {card.value ?? "—"}
                </p>
              </div>
            ))}
          </section>

          {/* =========================================
              KPIs secundarios del día
          ========================================= */}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondaryKpis.map((kpi) => (
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

          {/* =========================================
              Citas de hoy
          ========================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-title text-lg font-semibold text-slate-800">
                Citas de hoy
              </h2>

              <div className="flex items-center gap-3">
                <Link
                  to="/admin/citas/agendar"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Agendar cita
                </Link>

                <Link
                  to="/admin/citas"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todas
                </Link>
              </div>
            </div>

            {sortedToday.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="font-medium text-slate-700">
                  No hay citas programadas para hoy.
                </p>
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
                          {appointment.patient?.name ??
                            "Paciente no registrado"}
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
              Accesos rápidos
          ========================================= */}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primaryLight text-primary transition group-hover:bg-primary group-hover:text-white">
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

export default AdminDashboard;