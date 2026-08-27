import { useEffect } from "react";

import { getAppointmentAvailability } from "../../services/appointmentService";

function PatientDashboard() {
  useEffect(() => {
    const testAvailability = async () => {
      try {
        const data = await getAppointmentAvailability({
          doctorId: "6a6849dc18b524fb8588dc5a",
          serviceId: "6a7d45d772ecffb49d689aca",
          date: "2026-08-24",
        });

        console.log("Disponibilidad:", data);
      } catch (error) {
        console.error(
          "Error obteniendo disponibilidad:",
          error.response?.data || error,
        );
      }
    };

    testAvailability();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">
        Dashboard Paciente
      </h1>
    </div>
  );
}

export default PatientDashboard;