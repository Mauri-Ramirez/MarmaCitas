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

const formatBogotaDate = (dateTime) =>
  new Date(dateTime).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
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
    (appointment) => getBogotaDateKey(new Date(appointment.dateTime)) === todayKey,
  );

  const upcomingTodayAppointments = sortedAppointments.filter(
    (appointment) =>
      getBogotaDateKey(new Date(appointment.dateTime)) === todayKey &&
      new Date(appointment.dateTime) > now,
  );

  const confirmedAppointments = todayAppointments.filter(
    (appointment) => appointment.status === "confirmed",
  );

  const inProgressAppointments = todayAppointments.filter(
    (appointment) => appointment.status === "in_progress",
  );

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
    return <p>{error}</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Dashboard del odontólogo
        </h1>

        <p className="mt-2 text-lg text-gray-700">
          Buenos días, {user?.name || "odontólogo"}
        </p>

        <p className="mt-1 capitalize text-gray-500">
          {currentDate}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="border rounded-lg p-5 bg-white">
          <p className="text-sm text-gray-500">Citas de hoy</p>
          <p className="mt-2 text-3xl font-bold">
            {todayAppointments.length}
          </p>
        </div>

        <div className="border rounded-lg p-5 bg-white">
          <p className="text-sm text-gray-500">Citas confirmadas</p>
          <p className="mt-2 text-3xl font-bold">
            {confirmedAppointments.length}
          </p>
        </div>

        <div className="border rounded-lg p-5 bg-white">
          <p className="text-sm text-gray-500">Citas en atención</p>
          <p className="mt-2 text-3xl font-bold">
            {inProgressAppointments.length}
          </p>
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Citas de hoy</h2>

        {appointments.length === 0 ? (
          <div className="border rounded-lg p-5 bg-white">
            <p>No tienes citas registradas.</p>
          </div>
        ) : upcomingTodayAppointments.length === 0 ? (
          <div className="border rounded-lg p-5 bg-white">
            <p>No tienes citas programadas para hoy.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingTodayAppointments.slice(0, 3).map((appointment) => (
              <div
                key={appointment._id}
                className="border rounded-lg p-5 bg-white"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-gray-500 capitalize">
                      {formatBogotaDate(appointment.dateTime)}
                    </p>

                    <p className="text-lg font-semibold">
                      {formatBogotaTime(appointment.dateTime)}
                    </p>

                    <p className="font-medium">
                      {appointment.patient?.name || "Paciente no registrado"}
                    </p>

                    <p className="text-gray-700">
                      {appointment.serviceSnapshot?.name || "Servicio no registrado"}
                    </p>
                  </div>

                  <p className="font-medium text-gray-700">
                    {appointmentStatusLabels[appointment.status] || appointment.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DoctorDashboard;
