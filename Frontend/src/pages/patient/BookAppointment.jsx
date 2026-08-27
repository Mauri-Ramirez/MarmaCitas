import { useEffect, useState } from "react";

import { getDoctors } from "../../services/doctorService";
import { getServices } from "../../services/serviceService";

import {
  getAppointmentAvailability,
  createAppointment,
} from "../../services/appointmentService";

function BookAppointment() {
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [selectedService, setSelectedService] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // Cargar servicios y odontólogos
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesData, doctorsData] = await Promise.all([
          getServices(),
          getDoctors(),
        ]);

        setServices(servicesData);
        setDoctors(doctorsData);
      } catch (error) {
        console.error(
          "Error al cargar datos para agendar:",
          error,
        );

        setError(
          error.response?.data?.message ||
            "No fue posible cargar la información para agendar.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // =====================================================
  // Limpiar odontólogo y horario cuando cambia el servicio
  // =====================================================

  useEffect(() => {
    setSelectedDoctor("");
    setSelectedSlot("");
  }, [selectedService]);

  // =====================================================
  // Limpiar horario cuando cambia odontólogo o fecha
  // =====================================================

  useEffect(() => {
    setSelectedSlot("");
  }, [selectedDoctor, selectedDate]);

  // =====================================================
  // Consultar disponibilidad
  // =====================================================

  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedService || !selectedDoctor || !selectedDate) {
        setAvailableSlots([]);
        return;
      }

      try {
        setLoadingAvailability(true);

        const data = await getAppointmentAvailability({
          doctorId: selectedDoctor,
          serviceId: selectedService,
          date: selectedDate,
        });

        setAvailableSlots(data.availableSlots);
      } catch (error) {
        console.error(
          "Error al obtener disponibilidad:",
          error,
        );

        setAvailableSlots([]);
      } finally {
        setLoadingAvailability(false);
      }
    };

    loadAvailability();
  }, [selectedService, selectedDoctor, selectedDate]);

  // =====================================================
  // Estados de carga y error
  // =====================================================

  if (loading) {
    return <p>Cargando información...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  // =====================================================
  // Servicio seleccionado
  // =====================================================

  const selectedServiceData = services.find(
    (service) => service._id === selectedService,
  );

  // =====================================================
  // Filtrar odontólogos por especialidad
  // =====================================================

  const filteredDoctors = selectedServiceData
    ? doctors.filter(
        (doctor) =>
          doctor.specialty?._id ===
          selectedServiceData.specialty?._id,
      )
    : [];

  // =====================================================
  // Construir dateTime UTC
  // =====================================================

  const buildDateTime = () => {
    const localDate = new Date(
      `${selectedDate}T${selectedSlot}:00-05:00`,
    );

    return localDate.toISOString();
  };

  // =====================================================
  // Crear cita
  // =====================================================

  const handleCreateAppointment = async () => {
    if (
      !selectedService ||
      !selectedDoctor ||
      !selectedDate ||
      !selectedSlot
    ) {
      return;
    }

    try {
      setCreatingAppointment(true);
      setSuccessMessage("");

      const data = await createAppointment({
        doctor: selectedDoctor,
        service: selectedService,
        dateTime: buildDateTime(),
        notes: "",
      });

      console.log("Cita creada:", data);

      setSuccessMessage(
        data.message || "Cita creada correctamente.",
      );
    } catch (error) {
      console.error(
        "Error al crear la cita:",
        error,
      );

      setSuccessMessage("");

      alert(
        error.response?.data?.message ||
          "No fue posible crear la cita.",
      );
    } finally {
      setCreatingAppointment(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Agendar cita
      </h1>

      <div className="space-y-6">

        {/* =========================================
            Selección de servicio
        ========================================= */}

        <div>
          <label
            htmlFor="service"
            className="block font-semibold mb-2"
          >
            Servicio odontológico
          </label>

          <select
            id="service"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="">
              Selecciona un servicio
            </option>

            {services.map((service) => (
              <option
                key={service._id}
                value={service._id}
              >
                {service.name}
              </option>
            ))}
          </select>
        </div>

        {/* =========================================
            Información del servicio seleccionado
        ========================================= */}

        {selectedServiceData && (
          <div className="border rounded-lg p-4 bg-white">
            <h2 className="text-xl font-semibold">
              {selectedServiceData.name}
            </h2>

            <p>
              Duración:{" "}
              {selectedServiceData.duration} minutos
            </p>

            <p>
              Precio: ${selectedServiceData.price}
            </p>

            <p>
              Especialidad:{" "}
              {selectedServiceData.specialty?.name}
            </p>
          </div>
        )}

        {/* =========================================
            Selección de odontólogo
        ========================================= */}

        <div>
          <h2 className="text-xl font-semibold mb-2">
            Odontólogo
          </h2>

          {!selectedServiceData ? (
            <p>
              Primero selecciona un servicio.
            </p>
          ) : filteredDoctors.length === 0 ? (
            <p>
              No hay odontólogos disponibles para este servicio.
            </p>
          ) : (
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="">
                Selecciona un odontólogo
              </option>

              {filteredDoctors.map((doctor) => (
                <option
                  key={doctor._id}
                  value={doctor._id}
                >
                  {doctor.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* =========================================
            Selección de fecha
        ========================================= */}

        <div>
          <label
            htmlFor="date"
            className="block font-semibold mb-2"
          >
            Fecha de la cita
          </label>

          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        {/* =========================================
            Horarios disponibles
        ========================================= */}

        <div>
          <h2 className="text-xl font-semibold mb-2">
            Horarios disponibles
          </h2>

          {!selectedService ||
          !selectedDoctor ||
          !selectedDate ? (
            <p>
              Selecciona un servicio, odontólogo y fecha
              para consultar los horarios.
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
                  onClick={() => setSelectedSlot(slot)}
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

          {/* =========================================
              Horario seleccionado
          ========================================= */}

          {selectedSlot && (
            <p className="mt-4 font-semibold">
              Horario seleccionado: {selectedSlot}
            </p>
          )}
        </div>

        {/* =========================================
            Resumen de la cita
        ========================================= */}

        {selectedServiceData &&
          selectedDoctor &&
          selectedDate &&
          selectedSlot && (
            <div className="border rounded-lg p-4 bg-white">
              <h2 className="text-xl font-semibold mb-4">
                Resumen de la cita
              </h2>

              <p>
                <strong>Servicio:</strong>{" "}
                {selectedServiceData.name}
              </p>

              <p>
                <strong>Especialidad:</strong>{" "}
                {selectedServiceData.specialty?.name}
              </p>

              <p>
                <strong>Duración:</strong>{" "}
                {selectedServiceData.duration} minutos
              </p>

              <p>
                <strong>Precio:</strong>{" "}
                ${selectedServiceData.price}
              </p>

              <p>
                <strong>Odontólogo:</strong>{" "}
                {
                  filteredDoctors.find(
                    (doctor) => doctor._id === selectedDoctor,
                  )?.name
                }
              </p>

              <p>
                <strong>Fecha:</strong>{" "}
                {selectedDate}
              </p>

              <p>
                <strong>Hora:</strong>{" "}
                {selectedSlot}
              </p>

              {/* =========================================
                  Confirmar cita
              ========================================= */}

              <button
                type="button"
                onClick={handleCreateAppointment}
                disabled={creatingAppointment}
                className="mt-4 border rounded-lg px-6 py-2 bg-blue-700 text-white disabled:opacity-50"
              >
                {creatingAppointment
                  ? "Confirmando cita..."
                  : "Confirmar cita"}
              </button>

              {successMessage && (
                <p className="mt-4 font-semibold">
                  {successMessage}
                </p>
              )}
            </div>
          )}

      </div>
    </div>
  );
}

export default BookAppointment;