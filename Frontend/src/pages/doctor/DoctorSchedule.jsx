import { useContext, useEffect, useState } from "react";

import { AuthContext } from "../../context/AuthContext";
import { getMySchedule } from "../../services/scheduleService";

function DoctorSchedule() {
  const { user } = useContext(AuthContext);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noSchedule, setNoSchedule] = useState(false);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        setLoading(true);
        setError("");
        setNoSchedule(false);

        const data = await getMySchedule();

        setSchedule(data);
      } catch (error) {
        if (error.response?.status === 404) {
          setNoSchedule(true);
          return;
        }

        console.error("Error al obtener el horario:", error);

        setError(
          error.response?.data?.message ||
            "No fue posible cargar el horario.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, []);

  if (loading) {
    return <p>Cargando horario...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mi horario</h1>

        <p className="mt-2 text-gray-700">
          {schedule?.doctor?.name || user?.name || "Odontólogo"}
        </p>
      </div>

      {error && (
        <div className="border rounded-lg p-5 bg-white max-w-xl">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {noSchedule && (
        <div className="border rounded-lg p-5 bg-white max-w-xl">
          <p>No tienes un horario activo asignado.</p>
          <p className="mt-2 text-gray-600">
            Tu horario es administrado por la clínica.
          </p>
        </div>
      )}

      {schedule && (
        <div className="border rounded-lg p-6 bg-white max-w-xl">
          <h2 className="text-xl font-semibold mb-4">
            Horario laboral
          </h2>

          <div className="space-y-3">
            <div>
              <p className="font-semibold">Jornada</p>
              <p>Lunes a viernes</p>
            </div>

            <div>
              <p className="font-semibold">Hora de inicio</p>
              <p>{schedule.startTime}</p>
            </div>

            <div>
              <p className="font-semibold">Hora de finalización</p>
              <p>{schedule.endTime}</p>
            </div>

            <div>
              <p className="font-semibold">Estado</p>
              <p>{schedule.active ? "Activo" : "Inactivo"}</p>
            </div>
          </div>

          <p className="mt-6 border-t pt-4 text-gray-600">
            Tu horario es administrado por la clínica.
          </p>
        </div>
      )}
    </div>
  );
}

export default DoctorSchedule;
