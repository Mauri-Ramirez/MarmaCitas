import CalendarDatePicker from "./CalendarDatePicker";
import SlotGrid from "./SlotGrid";

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

function AppointmentBookingFields({
  catalogError,
  error,
  success,

  specialties,
  specialtyId,
  onSpecialtyChange,

  services,
  serviceId,
  onServiceChange,

  serviceDoctors,
  availableDoctors,
  doctorId,
  onDoctorChange,

  date,
  onDateChange,
  slots,
  selectedSlot,
  onSlotSelect,
  loadingAvailability,

  patients,
  patientSearch,
  onPatientSearchChange,
  onSearchPatients,
  searchingPatients,
  patientId,
  onPatientIdChange,

  notes,
  onNotesChange,

  creating,
  onSubmit,
}) {
  const selectedServiceData = services.find(
    (service) => service._id === serviceId,
  );

  const selectedDoctorData = availableDoctors.find(
    (doctor) => doctor._id === doctorId,
  );

  const showSummary = Boolean(
    selectedServiceData && date && selectedSlot && doctorId,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <h2 className="mb-1 font-title text-xl font-semibold text-slate-800">
        Agendar cita
      </h2>

      <p className="mb-6 text-sm text-slate-500">
        Registra una nueva cita para el paciente.
      </p>

      {catalogError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {catalogError}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      <div className="space-y-8">
        {/* =========================================
            Paciente
        ========================================= */}

        <section>
          <h3 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Paciente
          </h3>

          <p className="mb-4 text-sm text-slate-500">
            Busca al paciente por nombre o correo.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Buscar paciente
              </label>

              <form
                onSubmit={onSearchPatients}
                className="flex gap-2"
              >
                <input
                  type="search"
                  value={patientSearch}
                  onChange={(event) =>
                    onPatientSearchChange(event.target.value)
                  }
                  placeholder="Nombre o correo"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                  disabled={searchingPatients || creating}
                />

                <button
                  type="submit"
                  disabled={searchingPatients || creating}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {searchingPatients ? "Buscando..." : "Buscar"}
                </button>
              </form>
            </div>

            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Paciente
              </label>

              <select
                value={patientId}
                onChange={(event) =>
                  onPatientIdChange(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                disabled={creating}
              >
                <option value="">
                  {patients.length === 0
                    ? "No hay pacientes"
                    : "Selecciona un paciente"}
                </option>

                {patients.map((patient) => (
                  <option key={patient._id} value={patient._id}>
                    {patient.name} ({patient.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* =========================================
            Especialidad
        ========================================= */}

        <section>
          <h3 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Especialidad
          </h3>

          <p className="mb-4 text-sm text-slate-500">
            Elige el área odontológica.
          </p>

          {specialties.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay especialidades activas.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {specialties.map((specialty) => {
                const isSelected = specialtyId === specialty._id;

                return (
                  <button
                    key={specialty._id}
                    type="button"
                    onClick={() => onSpecialtyChange(specialty._id)}
                    aria-pressed={isSelected}
                    disabled={creating}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
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
                        {isSelected ? "Seleccionada" : "Especialidad"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================
            Servicio
        ========================================= */}

        <section>
          <h3 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Servicio odontológico
          </h3>

          <p className="mb-4 text-sm text-slate-500">
            {specialtyId
              ? "Selecciona el servicio que necesita el paciente."
              : "Primero selecciona una especialidad."}
          </p>

          {!specialtyId ? (
            <p className="text-sm text-slate-500">
              Primero selecciona una especialidad.
            </p>
          ) : services.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay servicios activos para esta especialidad.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => {
                const isSelected = serviceId === service._id;

                return (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() => onServiceChange(service._id)}
                    aria-pressed={isSelected}
                    disabled={creating}
                    className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
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
            Fecha
        ========================================= */}

        <section>
          <h3 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Fecha de la cita
          </h3>

          <p className="mb-4 text-sm text-slate-500">
            {serviceId
              ? "Elige el día de la cita."
              : "Primero selecciona un servicio."}
          </p>

          {!serviceId ? (
            <p className="text-sm text-slate-500">
              Primero selecciona un servicio.
            </p>
          ) : (
            <CalendarDatePicker
              value={date}
              onChange={onDateChange}
              disabled={creating}
            />
          )}
        </section>

        {/* =========================================
            Horarios
        ========================================= */}

        <section>
          <h3 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Horarios disponibles
          </h3>

          <p className="mb-4 text-sm text-slate-500">
            {serviceId && date
              ? "Elige la hora que prefieras."
              : "Selecciona un servicio y una fecha para consultar los horarios."}
          </p>

          {!serviceId || !date ? (
            <p className="text-sm text-slate-500">
              Selecciona un servicio y una fecha para consultar los horarios.
            </p>
          ) : loadingAvailability ? (
            <p className="text-sm text-slate-500">
              Consultando disponibilidad...
            </p>
          ) : serviceDoctors.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay odontólogos disponibles para este servicio.
            </p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay horarios disponibles para esta fecha.
            </p>
          ) : (
            <SlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={onSlotSelect}
              disabled={creating}
            />
          )}
        </section>

        {/* =========================================
            Odontólogos
        ========================================= */}

        <section>
          <h3 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Odontólogos disponibles
          </h3>

          <p className="mb-4 text-sm text-slate-500">
            {selectedSlot
              ? "Elige el odontólogo para la cita."
              : "Selecciona un horario para ver los odontólogos disponibles."}
          </p>

          {!selectedSlot ? (
            <p className="text-sm text-slate-500">
              Selecciona un horario para ver los odontólogos disponibles.
            </p>
          ) : availableDoctors.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay odontólogos disponibles en este horario.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availableDoctors.map((doctor) => {
                const isSelected = doctorId === doctor._id;

                return (
                  <button
                    key={doctor._id}
                    type="button"
                    onClick={() => onDoctorChange(doctor._id)}
                    aria-pressed={isSelected}
                    disabled={creating}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
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
            Motivo de consulta
        ========================================= */}

        <section>
          <label className="mb-2 block font-semibold text-slate-700">
            Motivo de consulta (opcional)
          </label>

          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Motivo por el que el paciente solicita la cita..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            disabled={creating}
          />
        </section>

        {/* =========================================
            Resumen y confirmación
        ========================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-title text-lg font-semibold text-slate-800">
              Resumen de la cita
            </h3>

            {showSummary && (
              <span className="rounded-full bg-primaryLight px-3 py-1 text-xs font-semibold text-primary">
                Listo para agendar
              </span>
            )}
          </div>

          {showSummary ? (
            <>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Paciente
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {patients.find((patient) => patient._id === patientId)
                      ?.name ?? "—"}
                  </dd>
                </div>

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
                    Odontólogo
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {selectedDoctorData?.name}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Fecha y hora
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {new Date(
                      `${date}T12:00:00-05:00`,
                    ).toLocaleDateString("es-CO", {
                      timeZone: "America/Bogota",
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {selectedSlot}
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
                    Valor
                  </dt>
                  <dd className="mt-1 font-title text-xl font-semibold text-slate-800">
                    ${selectedServiceData.price}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Completa paciente, servicio, fecha, horario y odontólogo para
              agendar la cita.
            </p>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onSubmit}
              disabled={!showSummary || creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50 sm:w-auto"
            >
              {creating ? "Agendando..." : "Agendar cita"}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

export default AppointmentBookingFields;