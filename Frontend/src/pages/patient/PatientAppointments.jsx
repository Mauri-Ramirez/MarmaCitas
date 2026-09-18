import { useEffect, useState } from "react";

import {
  getMyAppointments,
  cancelAppointment,
} from "../../services/appointmentService";

import AppointmentReschedule from "./AppointmentReschedule";

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

const formatBogotaDateTime = (dateTime) =>
  new Date(dateTime).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

const isUpcoming = (appointment) =>
  ["confirmed", "in_progress"].includes(appointment.status) &&
  new Date(appointment.dateTime) >= new Date();

// La cancelación por el paciente exige mínimo 24 horas de
// anticipación. El backend es la autoridad; esto solo
// refleja la regla en la interfaz.
const canCancelAppointment = (appointment) =>
  new Date(appointment.dateTime).getTime() - new Date().getTime() >=
  24 * 60 * 60 * 1000;

function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [cancellingAppointment, setCancellingAppointment] =
    useState(null);

  const [successMessage, setSuccessMessage] = useState("");

  const [actionError, setActionError] = useState("");

  const [reschedulingAppointment, setReschedulingAppointment] =
    useState(null);

  // =====================================================
  // Cargar citas
  // =====================================================

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const data = await getMyAppointments();

        setAppointments(data);
      } catch (error) {
        console.error(
          "Error al obtener las citas:",
          error,
        );

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

  // =====================================================
  // Cancelar cita
  // =====================================================

  const handleCancelAppointment = async (appointmentId) => {
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas cancelar esta cita?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingAppointment(appointmentId);
      setSuccessMessage("");
      setActionError("");

      const data = await cancelAppointment(
        appointmentId,
      );

      setSuccessMessage(
        data.message ||
          "Cita cancelada correctamente.",
      );

      const updatedAppointments =
        await getMyAppointments();

      setAppointments(updatedAppointments);
    } catch (error) {
      console.error(
        "Error al cancelar la cita:",
        error,
      );

      setActionError(
        error.response?.data?.message ||
          "No fue posible cancelar la cita.",
      );
    } finally {
      setCancellingAppointment(null);
    }
  };

  // =====================================================
  // Separación visual: próximas vs historial
  // =====================================================

  const upcomingAppointments = appointments
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

  const historyAppointments = appointments
    .filter((appointment) => !isUpcoming(appointment))
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

  // =====================================================
  // Estados de carga y error
  // =====================================================

  if (loading) {
    return <p>Cargando citas...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          Gestiona tus citas
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Mis citas
        </h1>
      </div>

      {/* =========================================
          Mensajes
      ========================================= */}

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {actionError}
        </div>
      )}

      {/* =========================================
          Sin citas
      ========================================= */}

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>

          <p className="mt-3 font-medium text-slate-700">
            No tienes citas registradas.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* =========================================
              Próximas citas
          ========================================= */}

          {upcomingAppointments.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-title text-lg font-semibold text-slate-800">
                  Próximas citas
                </h2>

                <span className="rounded-full bg-primaryLight px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {upcomingAppointments.length}
                </span>
              </div>

              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-title text-xl font-semibold text-slate-800">
                            {appointment.serviceSnapshot.name}
                          </h3>

                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              statusTone(appointment.status)
                            }`}
                          >
                            {appointmentStatusLabels[appointment.status] ??
                              appointment.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {formatBogotaDateTime(appointment.dateTime)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {appointment.doctor?.name ?? "Odontólogo"}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                              paymentTone(appointment.paymentStatus)
                            }`}
                          >
                            Pago:{" "}
                            {paymentStatusLabels[appointment.paymentStatus] ??
                              appointment.paymentStatus}
                          </span>

                          {appointment.reason && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                              Con motivo
                            </span>
                          )}
                        </div>

                        {appointment.reason && (
                          <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            <p className="font-semibold text-slate-700">
                              Motivo de consulta
                            </p>
                            <p className="mt-1">{appointment.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {appointment.status === "confirmed" && (
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {canCancelAppointment(appointment) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleCancelAppointment(
                                appointment._id,
                              )
                            }
                            disabled={
                              cancellingAppointment ===
                              appointment._id
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            {cancellingAppointment ===
                            appointment._id
                              ? "Cancelando..."
                              : "Cancelar cita"}
                          </button>
                        ) : (
                          <p className="w-full text-sm text-slate-500 sm:w-auto sm:self-center">
                            Las cancelaciones requieren mínimo 24 horas
                            de anticipación.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setReschedulingAppointment(
                              appointment,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                        >
                          Reprogramar
                        </button>
                      </div>
                    )}

                    {reschedulingAppointment?._id ===
                      appointment._id && (
                      <AppointmentReschedule
                        appointment={appointment}
                        onRescheduled={async () => {
                          const updatedAppointments =
                            await getMyAppointments();

                          setAppointments(
                            updatedAppointments,
                          );

                          setReschedulingAppointment(
                            null,
                          );
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =========================================
              Historial
          ========================================= */}

          {historyAppointments.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-title text-lg font-semibold text-slate-800">
                  Historial
                </h2>

                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                  {historyAppointments.length}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <ul className="divide-y divide-slate-100">
                  {historyAppointments.map((appointment) => (
                    <li
                      key={appointment._id}
                      className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {appointment.serviceSnapshot.name}
                        </p>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {formatBogotaDateTime(appointment.dateTime)}
                        </p>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {appointment.doctor?.name ?? "Odontólogo"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            statusTone(appointment.status)
                          }`}
                        >
                          {appointmentStatusLabels[appointment.status] ??
                            appointment.status}
                        </span>

                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            paymentTone(appointment.paymentStatus)
                          }`}
                        >
                          {paymentStatusLabels[appointment.paymentStatus] ??
                            appointment.paymentStatus}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default PatientAppointments;