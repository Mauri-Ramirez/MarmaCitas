import { useEffect, useState } from "react";

import {
  getMyAppointments,
  cancelAppointment,
} from "../../services/appointmentService";

import AppointmentReschedule from "./AppointmentReschedule";

function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [cancellingAppointment, setCancellingAppointment] =
    useState(null);

  const [successMessage, setSuccessMessage] = useState("");

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

      alert(
        error.response?.data?.message ||
          "No fue posible cancelar la cita.",
      );
    } finally {
      setCancellingAppointment(null);
    }
  };

  // =====================================================
  // Estados de carga y error
  // =====================================================

  if (loading) {
    return <p>Cargando citas...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Mis citas
      </h1>

      {/* =========================================
          Mensaje de éxito
      ========================================= */}

      {successMessage && (
        <p className="mb-4 font-semibold">
          {successMessage}
        </p>
      )}

      {/* =========================================
          Sin citas
      ========================================= */}

      {appointments.length === 0 ? (
        <p>No tienes citas registradas.</p>
      ) : (
        <div className="space-y-4">

          {appointments.map((appointment) => (
            <div
              key={appointment._id}
              className="border rounded-lg p-4 bg-white"
            >
              {/* =========================================
                  Información de la cita
              ========================================= */}

              <h2 className="text-xl font-semibold">
                {appointment.serviceSnapshot.name}
              </h2>

              <p>
                Odontólogo:{" "}
                {appointment.doctor?.name}
              </p>

              <p>
                Fecha:{" "}
                {new Date(
                  appointment.dateTime,
                ).toLocaleString("es-CO", {
                  timeZone: "America/Bogota",
                })}
              </p>

              <p>
                Estado: {appointment.status}
              </p>

              <p>
                Pago: {appointment.paymentStatus}
              </p>

              {/* =========================================
                  Acciones
              ========================================= */}

              {appointment.status === "confirmed" && (
                <div className="mt-4">

                  {/* =====================================
                      Cancelar
                  ===================================== */}

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
                    className="border rounded-lg px-4 py-2 bg-red-600 text-white disabled:opacity-50"
                  >
                    {cancellingAppointment ===
                    appointment._id
                      ? "Cancelando..."
                      : "Cancelar cita"}
                  </button>

                  {/* =====================================
                      Reprogramar
                  ===================================== */}

                  <button
                    type="button"
                    onClick={() =>
                      setReschedulingAppointment(
                        appointment,
                      )
                    }
                    className="ml-2 border rounded-lg px-4 py-2 bg-blue-600 text-white"
                  >
                    Reprogramar
                  </button>

                </div>
              )}

              {/* =========================================
                  Componente de reprogramación
              ========================================= */}

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
      )}
    </div>
  );
}

export default PatientAppointments;