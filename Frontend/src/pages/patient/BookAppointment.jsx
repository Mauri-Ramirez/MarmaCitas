import { useEffect, useState } from "react";

import { getDoctors } from "../../services/doctorService";
import { getServices } from "../../services/serviceService";
import { getSpecialties } from "../../services/specialtyService";

import { createAppointment } from "../../services/appointmentService";

import CalendarDatePicker from "../../components/appointments/CalendarDatePicker";
import SlotGrid from "../../components/appointments/SlotGrid";
import { useAppointmentAvailability } from "../../hooks/useAppointmentAvailability";

const dentalIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d="M12 5.5C10 4 7 4 5.5 6.5 4 9 4.5 13 6 16c.8 1.6 1.6 3.5 2.2 3.5.9 0 .8-3 1-5.5.2-1.5 1-2 2.8-2s2.6.5 2.8 2c.2 2.5.1 5.5 1 5.5.6 0 1.4-1.9 2.2-3.5 1.5-3 2-7 .5-9.5C16 4 14 4 12 5.5Z" />
    <path d="M12 5.5c0 1.5-1 2.5-2 3" />
  </svg>
);

const initialsOf = (name) =>
  (name || "")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function BookAppointment() {
  const [specialties, setSpecialties] = useState([]);
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");

  const [reason, setReason] = useState("");

  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [createError, setCreateError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    doctorSlots,
    unionSlots,
    loadingAvailability,
    refreshAvailability,
  } = useAppointmentAvailability({
    serviceId: selectedService,
    date: selectedDate,
    doctors,
    services,
  });

  // =====================================================
  // Cargar servicios y odontólogos
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        const [specialtiesData, servicesData, doctorsData] =
          await Promise.all([
            getSpecialties(),
            getServices(),
            getDoctors(),
          ]);

        setSpecialties(specialtiesData);
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

  if (loading) {
    return <p>Cargando información...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  // =====================================================
  // Servicios de la especialidad seleccionada
  // =====================================================

  const filteredServices = selectedSpecialty
    ? services.filter(
        (service) => service.specialty?._id === selectedSpecialty,
      )
    : [];

  // =====================================================
  // Servicio seleccionado
  // =====================================================

  const selectedServiceData = services.find(
    (service) => service._id === selectedService,
  );

  // =====================================================
  // Odontólogos de la especialidad del servicio
  // =====================================================

  const specialtyDoctors = selectedServiceData
    ? doctors.filter(
        (doctor) =>
          doctor.specialty?._id ===
          selectedServiceData.specialty?._id,
      )
    : [];

  const availableDoctors = specialtyDoctors.filter((doctor) =>
    (doctorSlots[doctor._id] ?? []).includes(selectedSlot),
  );

  // =====================================================
  // Cambios de selección (los resets viven aquí)
  // =====================================================

  const handleSpecialtyChange = (value) => {
    setSelectedSpecialty(value);
    setSelectedService("");
    setSelectedSlot("");
    setSelectedDoctor("");
  };

  const handleServiceChange = (value) => {
    setSelectedService(value);
    setSelectedSlot("");
    setSelectedDoctor("");
  };

  const handleDateChange = (value) => {
    setSelectedDate(value);
    setSelectedSlot("");
    setSelectedDoctor("");
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setSelectedDoctor("");
  };

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
      !selectedDate ||
      !selectedSlot ||
      !selectedDoctor
    ) {
      return;
    }

    try {
      setCreatingAppointment(true);
      setSuccessMessage("");
      setCreateError("");

      const data = await createAppointment({
        doctor: selectedDoctor,
        service: selectedService,
        dateTime: buildDateTime(),
        reason: reason.trim(),
      });

      setSuccessMessage(
        data.message || "Cita creada correctamente.",
      );

      setSelectedSlot("");
      setSelectedDoctor("");

      // Recalcular la disponibilidad para que el horario
      // recién agendado deje de mostrarse.
      refreshAvailability();
    } catch (error) {
      console.error(
        "Error al crear la cita:",
        error,
      );

      setSuccessMessage("");

      setCreateError(
        error.response?.data?.message ||
          "No fue posible crear la cita.",
      );
    } finally {
      setCreatingAppointment(false);
    }
  };

  const selectedDoctorData = availableDoctors.find(
    (doctor) => doctor._id === selectedDoctor,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          Reserva tu próxima consulta
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Agendar cita
        </h1>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      {createError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {createError}
        </div>
      )}

      <div className="space-y-8">

        {/* =========================================
            Paso 1: Especialidad
        ========================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Especialidad
          </h2>

          <p className="mb-4 text-sm text-slate-500">
            Elige el área odontológica de tu consulta.
          </p>

          {specialties.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay especialidades activas.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {specialties.map((specialty) => {
                const isSelected = selectedSpecialty === specialty._id;

                return (
                  <button
                    key={specialty._id}
                    type="button"
                    onClick={() =>
                      handleSpecialtyChange(specialty._id)
                    }
                    aria-pressed={isSelected}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-primary bg-primaryLight/60 ring-1 ring-primary"
                        : "border-slate-200 bg-white hover:border-primary/50 hover:shadow-sm"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-primaryLight text-primary"
                      }`}
                    >
                      {dentalIcon}
                    </span>

                    <span>
                      <span className="block font-semibold text-slate-800">
                        {specialty.name}
                      </span>

                      <span className="block text-xs text-slate-500">
                        {isSelected
                          ? "Seleccionada"
                          : "Especialidad"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================
            Paso 2: Servicio
        ========================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Servicio odontológico
          </h2>

          <p className="mb-4 text-sm text-slate-500">
            {selectedSpecialty
              ? "Selecciona el servicio que necesitas."
              : "Primero selecciona una especialidad."}
          </p>

          {!selectedSpecialty ? (
            <p className="text-sm text-slate-500">
              Primero selecciona una especialidad.
            </p>
          ) : filteredServices.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay servicios activos para esta especialidad.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredServices.map((service) => {
                const isSelected = selectedService === service._id;

                return (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() =>
                      handleServiceChange(service._id)
                    }
                    aria-pressed={isSelected}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-primary bg-primaryLight/60 ring-1 ring-primary"
                        : "border-slate-200 bg-white hover:border-primary/50 hover:shadow-sm"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-primaryLight text-primary"
                        }`}
                      >
                        {dentalIcon}
                      </span>

                      {isSelected && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                          Seleccionado
                        </span>
                      )}
                    </span>

                    <span className="mt-3 block font-semibold text-slate-800">
                      {service.name}
                    </span>

                    {service.description && (
                      <span className="mt-1 line-clamp-2 block text-xs text-slate-500">
                        {service.description}
                      </span>
                    )}

                    <span className="mt-3 flex items-center gap-2 text-sm">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {service.duration} min
                      </span>

                      <span className="font-semibold text-slate-800">
                        ${service.price}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================
            Paso 3: Fecha
        ========================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Fecha de la cita
          </h2>

          <p className="mb-4 text-sm text-slate-500">
            {selectedService
              ? "Elige el día de tu consulta."
              : "Primero selecciona un servicio."}
          </p>

          {!selectedService ? (
            <p className="text-sm text-slate-500">
              Primero selecciona un servicio.
            </p>
          ) : (
            <CalendarDatePicker
              value={selectedDate}
              onChange={handleDateChange}
            />
          )}
        </section>

        {/* =========================================
            Paso 4: Horarios disponibles
        ========================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Horarios disponibles
          </h2>

          <p className="mb-4 text-sm text-slate-500">
            {selectedService && selectedDate
              ? "Elige la hora que prefieras."
              : "Selecciona un servicio y una fecha para consultar los horarios."}
          </p>

          {!selectedService || !selectedDate ? (
            <p className="text-sm text-slate-500">
              Selecciona un servicio y una fecha
              para consultar los horarios.
            </p>
          ) : loadingAvailability ? (
            <p className="text-sm text-slate-500">
              Consultando disponibilidad...
            </p>
          ) : specialtyDoctors.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay odontólogos disponibles para este servicio.
            </p>
          ) : unionSlots.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay horarios disponibles para esta fecha.
            </p>
          ) : (
            <SlotGrid
              slots={unionSlots}
              selectedSlot={selectedSlot}
              onSelect={handleSlotSelect}
            />
          )}
        </section>

        {/* =========================================
            Paso 5: Odontólogos disponibles
        ========================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Odontólogos disponibles
          </h2>

          <p className="mb-4 text-sm text-slate-500">
            {selectedSlot
              ? "Elige el odontólogo para tu cita."
              : "Selecciona un horario para ver los odontólogos disponibles."}
          </p>

          {!selectedSlot ? (
            <p className="text-sm text-slate-500">
              Selecciona un horario para ver los
              odontólogos disponibles.
            </p>
          ) : availableDoctors.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay odontólogos disponibles en este horario.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availableDoctors.map((doctor) => {
                const isSelected = selectedDoctor === doctor._id;

                return (
                  <button
                    key={doctor._id}
                    type="button"
                    onClick={() => setSelectedDoctor(doctor._id)}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-primary bg-primaryLight/60 ring-1 ring-primary"
                        : "border-slate-200 bg-white hover:border-primary/50 hover:shadow-sm"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-primaryLight text-primary"
                      }`}
                    >
                      {initialsOf(doctor.name)}
                    </span>

                    <span>
                      <span className="block font-semibold text-slate-800">
                        {doctor.name}
                      </span>

                      <span className="block text-xs text-slate-500">
                        {doctor.specialty?.name ?? "Odontólogo"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================
            Paso 6: Notas
        ========================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-title text-lg font-semibold text-slate-800">
              Motivo de consulta
            </h2>

            <span className="text-xs text-slate-400">
              {reason.length}/500
            </span>
          </div>

          <p className="mb-4 text-sm text-slate-500">
            Cuéntale al odontólogo el motivo de tu consulta
            (opcional).
          </p>

          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Describe brevemente el motivo de tu consulta..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-50"
            disabled={creatingAppointment}
          />
        </section>

        {/* =========================================
            Resumen y confirmación
        ========================================= */}

        {selectedServiceData &&
          selectedDate &&
          selectedSlot &&
          selectedDoctor && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="font-title text-xl font-semibold text-slate-800">
                  Resumen de la cita
                </h2>

                <span className="rounded-full bg-primaryLight px-3 py-1 text-xs font-semibold text-primary">
                  Listo para confirmar
                </span>
              </div>

              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Servicio
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedServiceData.name}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Especialidad
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedServiceData.specialty?.name}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Duración
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedServiceData.duration} minutos
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Odontólogo
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedDoctorData?.name}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Fecha
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {new Date(
                      `${selectedDate}T12:00:00-05:00`,
                    ).toLocaleDateString("es-CO", {
                      timeZone: "America/Bogota",
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Hora
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedSlot}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Valor del servicio</p>
                  <p className="font-title text-2xl font-semibold text-slate-800">
                    ${selectedServiceData.price}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateAppointment}
                  disabled={creatingAppointment}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50 sm:w-auto"
                >
                  {creatingAppointment
                    ? "Confirmando cita..."
                    : "Confirmar cita"}
                </button>
              </div>
            </section>
          )}

      </div>
    </div>
  );
}

export default BookAppointment;