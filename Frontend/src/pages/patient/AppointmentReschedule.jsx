import { useEffect, useState } from "react";

import {
  getAppointmentAvailability,
  rescheduleAppointment,
} from "../../services/appointmentService";

import CalendarDatePicker from "../../components/appointments/CalendarDatePicker";
import SlotGrid from "../../components/appointments/SlotGrid";

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
    <div className="mt-5 rounded-2xl border border-primary/20 bg-primaryLight/30 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-title text-lg font-semibold text-slate-800">
          Reprogramar cita
        </h3>

        <span className="rounded-full bg-primaryLight px-3 py-1 text-xs font-semibold text-primary">
          Nueva fecha
        </span>
      </div>

      {/* =========================================
          Información de la cita actual
      ========================================= */}

      <div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <p>
          <strong className="text-slate-800">Fecha actual:</strong>{" "}
          {new Date(
            appointment.dateTime,
          ).toLocaleString("es-CO", {
            timeZone: "America/Bogota",
          })}
        </p>

        <p className="mt-1">
          <strong className="text-slate-800">Odontólogo:</strong>{" "}
          {appointment.doctor?.name}
        </p>

        <p className="mt-1">
          <strong className="text-slate-800">Servicio:</strong>{" "}
          {appointment.service?.name ||
            appointment.serviceSnapshot?.name}
        </p>
      </div>

      {/* =========================================
          Nueva fecha
      ========================================= */}

      <div className="mb-4">
        <label className="mb-2 block font-semibold text-slate-700">
          Nueva fecha
        </label>

        <CalendarDatePicker
          value={selectedDate}
          onChange={setSelectedDate}
        />
      </div>

      {/* =========================================
          Horarios disponibles
      ========================================= */}

      <div className="mb-4">
        <h4 className="mb-2 font-semibold text-slate-700">
          Horarios disponibles
        </h4>

        {!selectedDate ? (
          <p className="text-sm text-slate-500">
            Selecciona una nueva fecha para consultar
            los horarios.
          </p>
        ) : loadingAvailability ? (
          <p className="text-sm text-slate-500">
            Consultando disponibilidad...
          </p>
        ) : availableSlots.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay horarios disponibles para esta fecha.
          </p>
        ) : (
          <SlotGrid
            slots={availableSlots}
            selectedSlot={selectedSlot}
            onSelect={setSelectedSlot}
          />
        )}
      </div>

      {/* =========================================
          Horario seleccionado
      ========================================= */}

      {selectedSlot && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm">
          <p className="font-medium text-slate-800">
            Nuevo horario: {selectedSlot}
          </p>

          <p className="mt-0.5 text-slate-500">
            Fecha: {selectedDate}
          </p>
        </div>
      )}

      {/* =========================================
          Error
      ========================================= */}

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {/* =========================================
          Éxito
      ========================================= */}

      {successMessage && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
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
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
      >
        {rescheduling
          ? "Reprogramando..."
          : "Confirmar reprogramación"}
      </button>
    </div>
  );
}

export default AppointmentReschedule;