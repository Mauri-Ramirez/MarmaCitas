import { useEffect, useState } from "react";

import {
  getMyDoctorAppointments,
  updateAppointmentStatus,
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

const filterOptions = [
  { value: "all", label: "Todas" },
  { value: "today", label: "Hoy" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "in_progress", label: "En atención" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "no_show", label: "No asistió" },
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

function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [updatingAppointment, setUpdatingAppointment] = useState(null);

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

  const todayKey = getBogotaDateKey(new Date());

  const sortedAppointments = [...appointments].sort(
    (first, second) =>
      new Date(first.dateTime) - new Date(second.dateTime),
  );

  const todayAppointments = appointments.filter(
    (appointment) =>
      getBogotaDateKey(new Date(appointment.dateTime)) === todayKey,
  );

  const filteredAppointments = sortedAppointments.filter((appointment) => {
    if (selectedFilter === "all") {
      return true;
    }

    if (selectedFilter === "today") {
      return getBogotaDateKey(new Date(appointment.dateTime)) === todayKey;
    }

    return appointment.status === selectedFilter;
  });

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
            ? data.appointment
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

  if (loading) {
    return <p>Cargando citas...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mis citas</h1>
        <p className="mt-2 text-gray-700">
          Consulta y gestiona las citas de tus pacientes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="border rounded-lg p-5 bg-white">
          <p className="text-sm text-gray-500">Todas</p>
          <p className="mt-2 text-3xl font-bold">{appointments.length}</p>
        </div>

        <div className="border rounded-lg p-5 bg-white">
          <p className="text-sm text-gray-500">Hoy</p>
          <p className="mt-2 text-3xl font-bold">{todayAppointments.length}</p>
        </div>

        <div className="border rounded-lg p-5 bg-white">
          <p className="text-sm text-gray-500">Confirmadas</p>
          <p className="mt-2 text-3xl font-bold">
            {appointments.filter((appointment) => appointment.status === "confirmed").length}
          </p>
        </div>

        <div className="border rounded-lg p-5 bg-white">
          <p className="text-sm text-gray-500">Completadas</p>
          <p className="mt-2 text-3xl font-bold">
            {appointments.filter((appointment) => appointment.status === "completed").length}
          </p>
        </div>
      </div>

      {actionError && (
        <p className="mb-4 text-red-600">{actionError}</p>
      )}

      {successMessage && (
        <p className="mb-4 font-semibold">{successMessage}</p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {filterOptions.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setSelectedFilter(filter.value)}
            className={`border rounded-lg px-4 py-2 ${
              selectedFilter === filter.value
                ? "bg-blue-700 text-white"
                : "bg-white"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div className="border rounded-lg p-5 bg-white">
          <p>No tienes citas registradas.</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="border rounded-lg p-5 bg-white">
          <p>No hay citas que coincidan con este filtro.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <article
              key={appointment._id}
              className="border rounded-lg p-5 bg-white"
            >
              <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 capitalize">
                      {formatBogotaDate(appointment.dateTime)}
                    </p>
                    <p className="text-xl font-semibold">
                      {formatBogotaTime(appointment.dateTime)}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold">Paciente</p>
                    <p>{appointment.patient?.name || "Paciente no registrado"}</p>
                  </div>

                  <div>
                    <p className="font-semibold">Correo</p>
                    <p>{appointment.patient?.email || "No registrado"}</p>
                  </div>

                  <div>
                    <p className="font-semibold">Servicio</p>
                    <p>{appointment.serviceSnapshot?.name || "Servicio no registrado"}</p>
                  </div>

                  <div>
                    <p className="font-semibold">Duración</p>
                    <p>
                      {appointment.serviceSnapshot?.duration
                        ? `${appointment.serviceSnapshot.duration} min`
                        : "No registrada"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 md:text-right">
                  <div>
                    <p className="font-semibold">Estado</p>
                    <p>
                      {appointmentStatusLabels[appointment.status] || appointment.status}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold">Pago</p>
                    <p>
                      {paymentStatusLabels[appointment.paymentStatus] || appointment.paymentStatus}
                    </p>
                  </div>

                  {appointment.status === "confirmed" && (
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusUpdate(
                            appointment,
                            "in_progress",
                            "¿Deseas iniciar la atención de esta cita?",
                          )
                        }
                        disabled={updatingAppointment === appointment._id}
                        className="border rounded-lg px-4 py-2 bg-blue-700 text-white disabled:opacity-50"
                      >
                        Iniciar atención
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleStatusUpdate(
                            appointment,
                            "no_show",
                            "¿Deseas marcar esta cita como no asistió?",
                          )
                        }
                        disabled={updatingAppointment === appointment._id}
                        className="border rounded-lg px-4 py-2 bg-gray-700 text-white disabled:opacity-50"
                      >
                        No asistió
                      </button>
                    </div>
                  )}

                  {appointment.status === "in_progress" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusUpdate(
                          appointment,
                          "completed",
                          "¿Deseas finalizar la atención de esta cita?",
                        )
                      }
                      disabled={updatingAppointment === appointment._id}
                      className="border rounded-lg px-4 py-2 bg-green-600 text-white disabled:opacity-50"
                    >
                      Finalizar atención
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default DoctorAppointments;
