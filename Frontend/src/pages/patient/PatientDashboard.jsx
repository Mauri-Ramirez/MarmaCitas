import { useContext, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { getMyAppointments } from "../../services/appointmentService";
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

const accessLinks = [
  {
    to: "/paciente/agendar",
    title: "Agendar cita",
    description: "Reserva una nueva cita odontológica.",
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
    to: "/paciente/citas",
    title: "Mis citas",
    description: "Consulta, cancela o reprograma tus citas.",
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
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    to: "/paciente/perfil",
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

function PatientDashboard() {
  const { user } = useContext(AuthContext);

  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getMyAppointments();

        const now = new Date();

        const upcoming = data
          .filter(
            (appointment) =>
              ["confirmed", "in_progress"].includes(appointment.status) &&
              new Date(appointment.dateTime) > now,
          )
          .sort(
            (a, b) => new Date(a.dateTime) - new Date(b.dateTime),
          )
          .slice(0, 3);

        setUpcomingAppointments(upcoming);
      } catch (loadError) {
        console.error(
          "Error al obtener las próximas citas:",
          loadError,
        );

        setError(
          loadError.response?.data?.message ||
            "No fue posible cargar tus próximas citas.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const nextAppointment = upcomingAppointments[0];

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          Portal del paciente
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Hola, {user?.name ?? "paciente"}
        </h1>

        <p className="mt-2 text-slate-500">
          Bienvenido a tu portal de citas odontológicas.
        </p>
      </div>

      {/* =========================================
          Próximas citas
      ========================================= */}

      <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-title text-lg font-semibold text-slate-800">
            Próximas citas
          </h2>

          <Link
            to="/paciente/citas"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todas
          </Link>
        </div>

        {error && (
          <p className="px-6 py-4 text-sm text-red-600">{error}</p>
        )}

        {loading ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            Cargando citas...
          </p>
        ) : upcomingAppointments.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primaryLight text-primary">
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
            </div>

            <p className="mt-3 font-medium text-slate-700">
              No tienes citas próximas.
            </p>

            <Link
              to="/paciente/agendar"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
            >
              Agendar mi primera cita
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingAppointments.map((appointment) => (
              <li
                key={appointment._id}
                className={`flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between ${
                  appointment._id === nextAppointment?._id
                    ? "bg-gradient-to-br from-primaryLight/50 to-white"
                    : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-slate-200">
                    <span className="text-lg font-semibold leading-none">
                      {formatBogotaDate(appointment.dateTime).split(" ")[0]}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide">
                      {new Date(appointment.dateTime)
                        .toLocaleDateString("es-CO", {
                          timeZone: "America/Bogota",
                          month: "short",
                        })
                        .replace(".", "")}
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800">
                      {appointment.serviceSnapshot?.name ?? "Servicio"}
                    </p>

                    <p className="text-sm text-slate-500">
                      {formatBogotaDate(appointment.dateTime)} ·{" "}
                      {formatBogotaTime(appointment.dateTime)}
                    </p>

                    <p className="mt-0.5 text-sm text-slate-500">
                      {appointment.doctor?.name ?? "Odontólogo"}
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
          Acciones principales
      ========================================= */}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accessLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`group flex items-start gap-4 rounded-2xl border p-5 transition hover:shadow-md ${
              link.accent
                ? "border-primary/30 bg-primaryLight/40 hover:border-primary"
                : "border-slate-200 bg-white hover:border-primary/40"
            }`}
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition ${
                link.accent
                  ? "bg-primary text-white"
                  : "bg-primaryLight text-primary group-hover:bg-primary group-hover:text-white"
              }`}
            >
              {link.icon}
            </span>

            <span>
              <span className="block font-title font-semibold text-slate-800">
                {link.title}
              </span>

              <span className="mt-1 block text-sm text-slate-500">
                {link.description}
              </span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

export default PatientDashboard;