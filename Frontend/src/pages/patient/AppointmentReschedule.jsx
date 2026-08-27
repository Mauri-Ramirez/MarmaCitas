import { useEffect, useState } from "react";

import {
  getAppointmentAvailability,
  rescheduleAppointment,
} from "../../services/appointmentService";

function AppointmentReschedule({ appointment, onRescheduled }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const [availableSlots, setAvailableSlots] = useState([]);

  const [loadingAvailability, setLoadingAvailability] =
    useState(false);

  const [rescheduling, setRescheduling] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // =====================================================
  // Consultar disponibilidad
  // =====================================================

  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedDate) {
        setAvailableSlots([]);
        setSelectedSlot("");
        return;
      }

      try {
        setLoadingAvailability(true);
        setError("");
        setSelectedSlot("");

        const data = await getAppointmentAvailability({
          doctorId: appointment.doctor._id,
          serviceId: appointment.service._id,
          date: selectedDate,
        });

        setAvailableSlots(data.availableSlots);
      } catch (error) {
        console.error(
          "Error al obtener disponibilidad:",
          error,
        );

        setAvailableSlots([]);

        setError(
          error.response?.data?.message ||
            "No fue posible consultar la disponibilidad.",
        );
      } finally {
        setLoadingAvailability(false);
      }
    };

    loadAvailability();
  }, [selectedDate, appointment]);

  // =====================================================
  // Convertir fecha + hora Colombia → UTC
  // =====================================================

  const buildDateTime = () => {
    const localDate = new Date(
      `${selectedDate}T${selectedSlot}:00-05:00`,
    );

    return localDate.toISOString();
  };

  // =====================================================
  // Reprogramar cita
  // =====================================================

  const handleReschedule = async () => {
    if (!selectedDate || !selectedSlot) {
      return;
    }

    try {
      setRescheduling(true);
      setError("");
      setSuccessMessage("");

      const data = await rescheduleAppointment(
        appointment._id,
        buildDateTime(),
      );

      console.log("Cita reprogramada:", data);

      setSuccessMessage(
        data.message ||
          "Cita reprogramada correctamente.",
      );

      // Avisar al componente padre
      if (onRescheduled) {
        onRescheduled(data.appointment);
      }
    } catch (error) {
      console.error(
        "Error al reprogramar la cita:",
        error,
      );

      setError(
        error.response?.data?.message ||
          "No fue posible reprogramar la cita.",
      );
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="mt-4 border rounded-lg p-4 bg-gray-50">

      <h3 className="text-lg font-semibold mb-4">
        Reprogramar cita
      </h3>

      {/* =========================================
          Información de la cita actual
      ========================================= */}

      <div className="mb-4">
        <p>
          <strong>Fecha actual:</strong>{" "}
          {new Date(
            appointment.dateTime,
          ).toLocaleString("es-CO", {
            timeZone: "America/Bogota",
          })}
        </p>

        <p>
          <strong>Odontólogo:</strong>{" "}
          {appointment.doctor?.name}
        </p>

        <p>
          <strong>Servicio:</strong>{" "}
          {appointment.service?.name ||
            appointment.serviceSnapshot?.name}
        </p>
      </div>

      {/* =========================================
          Nueva fecha
      ========================================= */}

      <div className="mb-4">
        <label
          htmlFor={`reschedule-date-${appointment._id}`}
          className="block font-semibold mb-2"
        >
          Nueva fecha
        </label>

        <input
          id={`reschedule-date-${appointment._id}`}
          type="date"
          value={selectedDate}
          onChange={(e) =>
            setSelectedDate(e.target.value)
          }
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>

      {/* =========================================
          Horarios disponibles
      ========================================= */}

      <div className="mb-4">
        <h4 className="font-semibold mb-2">
          Horarios disponibles
        </h4>

        {!selectedDate ? (
          <p>
            Selecciona una nueva fecha para consultar
            los horarios.
          </p>
        ) : loadingAvailability ? (
          <p>
            Consultando disponibilidad...
          </p>
        ) : availableSlots.length === 0 ? (
          <p>
            No hay horarios disponibles para esta fecha.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() =>
                  setSelectedSlot(slot)
                }
                className={`border rounded-lg px-4 py-2 ${
                  selectedSlot === slot
                    ? "bg-blue-700 text-white"
                    : "bg-white"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =========================================
          Horario seleccionado
      ========================================= */}

      {selectedSlot && (
        <div className="mb-4">
          <p className="font-semibold">
            Nuevo horario seleccionado:{" "}
            {selectedSlot}
          </p>

          <p>
            Nueva fecha: {selectedDate}
          </p>
        </div>
      )}

      {/* =========================================
          Error
      ========================================= */}

      {error && (
        <p className="mb-4 text-red-600">
          {error}
        </p>
      )}

      {/* =========================================
          Éxito
      ========================================= */}

      {successMessage && (
        <p className="mb-4 font-semibold">
          {successMessage}
        </p>
      )}

      {/* =========================================
          Confirmar reprogramación
      ========================================= */}

      <button
        type="button"
        onClick={handleReschedule}
        disabled={
          !selectedDate ||
          !selectedSlot ||
          rescheduling
        }
        className="border rounded-lg px-6 py-2 bg-blue-700 text-white disabled:opacity-50"
      >
        {rescheduling
          ? "Reprogramando..."
          : "Confirmar reprogramación"}
      </button>
    </div>
  );
}

export default AppointmentReschedule;
