import { useCallback, useEffect, useState } from "react";

import {
  createDoctor,
  deactivateDoctor,
  getDoctors,
  updateDoctor,
} from "../../services/doctorService";
import {
  createSchedule,
  getDoctorSchedule,
  updateSchedule,
} from "../../services/scheduleService";
import { getSpecialties } from "../../services/specialtyService";

const getErrorMessage = (error, fallbackMessage) => {
  const status = error.response?.status;
  const backendMessage = error.response?.data?.message;

  if (status === 403) {
    return "No tienes permisos para realizar esta acción.";
  }

  if (status === 404) {
    return "Odontólogo no encontrado.";
  }

  return backendMessage || fallbackMessage;
};

const initialsOf = (name) =>
  (name || "")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";

function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [professionalLicense, setProfessionalLicense] = useState("");
  const [phone, setPhone] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [createScheduleStart, setCreateScheduleStart] = useState("");
  const [createScheduleEnd, setCreateScheduleEnd] = useState("");
  const [createScheduleBreakStart, setCreateScheduleBreakStart] = useState("");
  const [createScheduleBreakEnd, setCreateScheduleBreakEnd] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleFormError, setScheduleFormError] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleEditMode, setScheduleEditMode] = useState(false);
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleBreakStart, setScheduleBreakStart] = useState("");
  const [scheduleBreakEnd, setScheduleBreakEnd] = useState("");
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLicense, setEditLicense] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSpecialtyId, setEditSpecialtyId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setListError("");

      const [doctorsData, specialtiesData] = await Promise.all([
        getDoctors(),
        getSpecialties(),
      ]);

      setDoctors(doctorsData);
      setSpecialties(specialtiesData);
    } catch (error) {
      console.error("Error al cargar los odontólogos:", error);

      setDoctors([]);
      setListError(
        getErrorMessage(
          error,
          "No fue posible cargar los odontólogos.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadData();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadData]);

  const loadSchedule = async (doctorId) => {
    try {
      setScheduleLoading(true);
      setSchedule(null);
      setScheduleFormError("");
      setScheduleMessage("");
      setScheduleEditMode(false);
      setScheduleStartTime("");
      setScheduleEndTime("");
      setScheduleBreakStart("");
      setScheduleBreakEnd("");

      const data = await getDoctorSchedule(doctorId);

      setSchedule(data);
    } catch (error) {
      if (error.response?.status === 404) {
        setSchedule(null);
        return;
      }

      console.error("Error al obtener el horario:", error);

      setScheduleFormError(
        getErrorMessage(error, "No fue posible cargar el horario."),
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleViewDoctor = (doctor) => {
    if (selectedDoctor?._id === doctor._id) {
      setSelectedDoctor(null);
      setSchedule(null);
      setScheduleFormError("");
      setScheduleMessage("");
      return;
    }

    setSelectedDoctor(doctor);
    loadSchedule(doctor._id);
  };

  const validateScheduleHours = (
    startTime,
    endTime,
    breakStart,
    breakEnd,
    setError,
  ) => {
    if (!startTime || !endTime) {
      setError("Selecciona la hora de inicio y la hora de finalización.");
      return false;
    }

    if (startTime >= endTime) {
      setError(
        "La hora de inicio debe ser menor que la hora de finalización.",
      );
      return false;
    }

    if (breakStart && !breakEnd) {
      setError(
        "Si indicas una pausa debes indicar su hora de inicio y de finalización.",
      );
      return false;
    }

    if (breakEnd && !breakStart) {
      setError(
        "Si indicas una pausa debes indicar su hora de inicio y de finalización.",
      );
      return false;
    }

    if (breakStart && breakEnd) {
      if (breakStart >= breakEnd) {
        setError(
          "La hora de inicio de la pausa debe ser menor que su hora de finalización.",
        );
        return false;
      }

      if (breakStart <= startTime || breakEnd >= endTime) {
        setError("La pausa debe estar dentro del horario laboral.");
        return false;
      }
    }

    return true;
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedName) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setFormError("El correo electrónico no tiene un formato válido.");
      return;
    }

    if (!password || password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (!professionalLicense.trim()) {
      setFormError("La licencia profesional es obligatoria.");
      return;
    }

    if (!specialtyId) {
      setFormError("Selecciona una especialidad.");
      return;
    }

    const scheduleRequested = Boolean(
      createScheduleStart ||
        createScheduleEnd ||
        createScheduleBreakStart ||
        createScheduleBreakEnd,
    );

    if (
      scheduleRequested &&
      !validateScheduleHours(
        createScheduleStart,
        createScheduleEnd,
        createScheduleBreakStart,
        createScheduleBreakEnd,
        setFormError,
      )
    ) {
      return;
    }

    try {
      setCreating(true);

      // =============================================
      // 1) Crear el odontólogo
      // =============================================

      let newDoctorId = null;

      try {
        const data = await createDoctor({
          name: normalizedName,
          email: normalizedEmail,
          password,
          professionalLicense: professionalLicense.trim(),
          phone: phone.trim(),
          specialty: specialtyId,
        });

        newDoctorId = data.doctor?._id;
      } catch (createDoctorError) {
        console.error("Error al crear el odontólogo:", createDoctorError);

        setFormError(
          getErrorMessage(
            createDoctorError,
            "No fue posible crear el odontólogo.",
          ),
        );

        return;
      }

      // Limpiar los campos del doctor para evitar duplicados
      // al reintentar: el doctor ya fue creado.
      setName("");
      setEmail("");
      setPassword("");
      setProfessionalLicense("");
      setPhone("");
      setSpecialtyId("");

      // =============================================
      // 2) Crear el horario (opcional)
      // =============================================

      if (scheduleRequested && newDoctorId) {
        try {
          await createSchedule({
            doctor: newDoctorId,
            startTime: createScheduleStart,
            endTime: createScheduleEnd,
            breakStart: createScheduleBreakStart || undefined,
            breakEnd: createScheduleBreakEnd || undefined,
          });

          setSuccessMessage(
            "Odontólogo creado correctamente con su horario.",
          );
        } catch (scheduleError) {
          console.error(
            "Error al crear el horario del odontólogo:",
            scheduleError,
          );

          setSuccessMessage(
            "Odontólogo creado correctamente.",
          );

          setFormError(
            `El odontólogo se creó correctamente, pero no se pudo guardar el horario: ${getErrorMessage(
              scheduleError,
              "revisa los datos del horario.",
            )}. Puedes crear o editar el horario desde el detalle del odontólogo.`,
          );
        }
      } else {
        setSuccessMessage(
          "Odontólogo creado correctamente.",
        );
      }

      setCreateScheduleStart("");
      setCreateScheduleEnd("");
      setCreateScheduleBreakStart("");
      setCreateScheduleBreakEnd("");

      await loadData();
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (doctor) => {
    setEditingDoctor(doctor);
    setEditName(doctor.name || "");
    setEditLicense(doctor.professionalLicense || "");
    setEditPhone(doctor.phone || "");
    setEditSpecialtyId(doctor.specialty?._id || "");
    setEditError("");
    setSuccessMessage("");
  };

  const handleCancelEdit = () => {
    setEditingDoctor(null);
    setEditError("");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    setEditError("");

    const normalizedName = editName.trim();

    if (!normalizedName) {
      setEditError("El nombre es obligatorio.");
      return;
    }

    if (!editLicense.trim()) {
      setEditError("La licencia profesional es obligatoria.");
      return;
    }

    if (!editSpecialtyId) {
      setEditError("Selecciona una especialidad.");
      return;
    }

    try {
      setSavingEdit(true);

      const data = await updateDoctor(editingDoctor._id, {
        name: normalizedName,
        professionalLicense: editLicense.trim(),
        phone: editPhone.trim(),
        specialty: editSpecialtyId,
      });

      setEditingDoctor(null);
      setSuccessMessage(
        data.message || "Odontólogo actualizado correctamente.",
      );

      await loadData();
    } catch (error) {
      console.error("Error al actualizar el odontólogo:", error);

      setEditError(
        getErrorMessage(
          error,
          "No fue posible actualizar el odontólogo.",
        ),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeactivate = async (doctor) => {
    if (!window.confirm(`¿Deseas desactivar al odontólogo "${doctor.name}"?`)) {
      return;
    }

    try {
      const data = await deactivateDoctor(doctor._id);

      setSuccessMessage(
        data.message || "Odontólogo desactivado correctamente.",
      );

      if (selectedDoctor?._id === doctor._id) {
        setSelectedDoctor(null);
        setSchedule(null);
      }

      if (editingDoctor?._id === doctor._id) {
        setEditingDoctor(null);
      }

      await loadData();
    } catch (error) {
      console.error("Error al desactivar el odontólogo:", error);

      setListError(
        getErrorMessage(
          error,
          "No fue posible desactivar el odontólogo.",
        ),
      );
    }
  };

  const handleCreateSchedule = async () => {
    if (
      !validateScheduleHours(
        scheduleStartTime,
        scheduleEndTime,
        scheduleBreakStart,
        scheduleBreakEnd,
        setScheduleFormError,
      )
    ) {
      return;
    }

    try {
      setScheduleSaving(true);
      setScheduleFormError("");
      setScheduleMessage("");

      const data = await createSchedule({
        doctor: selectedDoctor._id,
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
        breakStart: scheduleBreakStart || undefined,
        breakEnd: scheduleBreakEnd || undefined,
      });

      setScheduleMessage(
        data.message || "Horario creado correctamente.",
      );

      await loadSchedule(selectedDoctor._id);
    } catch (error) {
      console.error("Error al crear el horario:", error);

      setScheduleFormError(
        getErrorMessage(error, "No fue posible crear el horario."),
      );
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleStartScheduleEdit = () => {
    setScheduleEditMode(true);
    setScheduleStartTime(schedule.startTime || "");
    setScheduleEndTime(schedule.endTime || "");
    setScheduleBreakStart(schedule.breakStart || "");
    setScheduleBreakEnd(schedule.breakEnd || "");
    setScheduleFormError("");
    setScheduleMessage("");
  };

  const handleCancelScheduleEdit = () => {
    setScheduleEditMode(false);
    setScheduleFormError("");
  };

  const handleSaveScheduleEdit = async () => {
    if (
      !validateScheduleHours(
        scheduleStartTime,
        scheduleEndTime,
        scheduleBreakStart,
        scheduleBreakEnd,
        setScheduleFormError,
      )
    ) {
      return;
    }

    try {
      setScheduleSaving(true);
      setScheduleFormError("");
      setScheduleMessage("");

      const data = await updateSchedule(schedule._id, {
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
        breakStart: scheduleBreakStart || undefined,
        breakEnd: scheduleBreakEnd || undefined,
      });

      setScheduleMessage(
        data.message || "Horario actualizado correctamente.",
      );
      setScheduleEditMode(false);

      await loadSchedule(selectedDoctor._id);
    } catch (error) {
      console.error("Error al actualizar el horario:", error);

      setScheduleFormError(
        getErrorMessage(error, "No fue posible actualizar el horario."),
      );
    } finally {
      setScheduleSaving(false);
    }
  };

  const specialtySelect = (id, value, onChange, disabled) => (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
      disabled={disabled}
    >
      <option value="">Selecciona una especialidad</option>
      {specialties.map((specialty) => (
        <option key={specialty._id} value={specialty._id}>
          {specialty.name}
        </option>
      ))}
    </select>
  );

  const scheduleTimeFields = ({ start, end, breakStart, breakEnd, disabled }) => (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor={start.id}
            className="mb-2 block font-semibold text-slate-700"
          >
            Hora de inicio
          </label>
          <input
            id={start.id}
            type="time"
            value={start.value}
            onChange={(event) => start.onChange(event.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        </div>

        <div>
          <label
            htmlFor={end.id}
            className="mb-2 block font-semibold text-slate-700"
          >
            Hora de finalización
          </label>
          <input
            id={end.id}
            type="time"
            value={end.value}
            onChange={(event) => end.onChange(event.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor={breakStart.id}
            className="mb-2 block font-semibold text-slate-700"
          >
            Pausa (inicio)
          </label>
          <input
            id={breakStart.id}
            type="time"
            value={breakStart.value}
            onChange={(event) => breakStart.onChange(event.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        </div>

        <div>
          <label
            htmlFor={breakEnd.id}
            className="mb-2 block font-semibold text-slate-700"
          >
            Pausa (finalización)
          </label>
          <input
            id={breakEnd.id}
            type="time"
            value={breakEnd.value}
            onChange={(event) => breakEnd.onChange(event.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Opcional. La jornada de la clínica es 08:00-12:00 y 14:00-17:00.
      </p>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">
          Gestión de odontólogos
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Odontólogos
        </h1>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      {listError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {listError}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-3">
        {/* =========================================
            Crear odontólogo (con horario)
        ========================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Crear odontólogo
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            Registra al profesional y su horario laboral.
          </p>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label
                htmlFor="doctor-name"
                className="mb-2 block font-semibold text-slate-700"
              >
                Nombre
              </label>
              <input
                id="doctor-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                disabled={creating}
              />
            </div>

            <div>
              <label
                htmlFor="doctor-email"
                className="mb-2 block font-semibold text-slate-700"
              >
                Correo electrónico
              </label>
              <input
                id="doctor-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                disabled={creating}
              />
            </div>

            <div>
              <label
                htmlFor="doctor-password"
                className="mb-2 block font-semibold text-slate-700"
              >
                Contraseña
              </label>
              <input
                id="doctor-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                disabled={creating}
              />
            </div>

            <div>
              <label
                htmlFor="doctor-license"
                className="mb-2 block font-semibold text-slate-700"
              >
                Licencia profesional
              </label>
              <input
                id="doctor-license"
                type="text"
                value={professionalLicense}
                onChange={(event) =>
                  setProfessionalLicense(event.target.value)
                }
                className={inputClass}
                disabled={creating}
              />
            </div>

            <div>
              <label
                htmlFor="doctor-phone"
                className="mb-2 block font-semibold text-slate-700"
              >
                Teléfono
              </label>
              <input
                id="doctor-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={20}
                className={inputClass}
                disabled={creating}
              />
            </div>

            <div>
              <label
                htmlFor="doctor-specialty"
                className="mb-2 block font-semibold text-slate-700"
              >
                Especialidad
              </label>
              {specialtySelect(
                "doctor-specialty",
                specialtyId,
                setSpecialtyId,
                creating,
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-3 font-semibold text-slate-800">
                Horario laboral
              </h3>

              {scheduleTimeFields({
                start: {
                  id: "create-schedule-start",
                  value: createScheduleStart,
                  onChange: setCreateScheduleStart,
                },
                end: {
                  id: "create-schedule-end",
                  value: createScheduleEnd,
                  onChange: setCreateScheduleEnd,
                },
                breakStart: {
                  id: "create-schedule-break-start",
                  value: createScheduleBreakStart,
                  onChange: setCreateScheduleBreakStart,
                },
                breakEnd: {
                  id: "create-schedule-break-end",
                  value: createScheduleBreakEnd,
                  onChange: setCreateScheduleBreakEnd,
                },
                disabled: creating,
              })}
            </div>

            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              {creating ? "Creando..." : "Crear odontólogo"}
            </button>
          </form>
        </section>

        {/* =========================================
            Listado de odontólogos
        ========================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] xl:col-span-2">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-title text-lg font-semibold text-slate-800">
              Listado de odontólogos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {doctors.length} odontólogo{doctors.length === 1 ? "" : "s"}{" "}
              activo{doctors.length === 1 ? "" : "s"}.
            </p>
          </div>

          {loading ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              Cargando odontólogos...
            </p>
          ) : doctors.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-medium text-slate-700">
                No hay odontólogos activos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-semibold">Odontólogo</th>
                    <th className="px-4 py-3 font-semibold">Especialidad</th>
                    <th className="px-4 py-3 font-semibold">Licencia</th>
                    <th className="px-4 py-3 font-semibold">Teléfono</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr
                      key={doctor._id}
                      className="border-b last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primaryLight font-title text-sm font-semibold text-primary">
                            {initialsOf(doctor.name)}
                          </span>

                          <div>
                            <p className="font-medium text-slate-800">
                              {doctor.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {doctor.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-primaryLight px-3 py-1 text-xs font-semibold text-primary">
                          {doctor.specialty?.name ?? "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {doctor.professionalLicense}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {doctor.phone || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewDoctor(doctor)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            {selectedDoctor?._id === doctor._id
                              ? "Ocultar"
                              : "Ver"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(doctor)}
                            disabled={savingEdit}
                            className="rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeactivate(doctor)}
                            disabled={savingEdit}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            Desactivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* =========================================
          Detalle del odontólogo + horario
      ========================================= */}

      {selectedDoctor && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-title text-lg font-semibold text-slate-800">
              Detalle del odontólogo
            </h2>

            <button
              type="button"
              onClick={() => handleViewDoctor(selectedDoctor)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Ocultar
            </button>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Nombre
                </p>
                <p className="mt-1 font-medium text-slate-800">
                  {selectedDoctor.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Especialidad
                </p>
                <p className="mt-1 font-medium text-slate-800">
                  {selectedDoctor.specialty?.name ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Licencia profesional
                </p>
                <p className="mt-1 font-medium text-slate-800">
                  {selectedDoctor.professionalLicense}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Teléfono
                </p>
                <p className="mt-1 font-medium text-slate-800">
                  {selectedDoctor.phone || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Correo electrónico
                </p>
                <p className="mt-1 font-medium text-slate-800">
                  {selectedDoctor.email}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="mb-4 font-title text-base font-semibold text-slate-800">
                Horario laboral
              </h3>

              {scheduleMessage && (
                <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {scheduleMessage}
                </div>
              )}

              {scheduleFormError && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {scheduleFormError}
                </div>
              )}

              {scheduleLoading ? (
                <p className="text-sm text-slate-500">Cargando horario...</p>
              ) : schedule ? (
                <>
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {schedule.startTime} — {schedule.endTime}
                    {schedule.breakStart && schedule.breakEnd && (
                      <span className="text-slate-500">
                        {" "}
                        (pausa {schedule.breakStart} — {schedule.breakEnd})
                      </span>
                    )}
                  </p>

                  {scheduleEditMode ? (
                    <div className="mt-4 space-y-4">
                      {scheduleTimeFields({
                        start: {
                          id: "schedule-start",
                          value: scheduleStartTime,
                          onChange: setScheduleStartTime,
                        },
                        end: {
                          id: "schedule-end",
                          value: scheduleEndTime,
                          onChange: setScheduleEndTime,
                        },
                        breakStart: {
                          id: "schedule-break-start",
                          value: scheduleBreakStart,
                          onChange: setScheduleBreakStart,
                        },
                        breakEnd: {
                          id: "schedule-break-end",
                          value: scheduleBreakEnd,
                          onChange: setScheduleBreakEnd,
                        },
                        disabled: scheduleSaving,
                      })}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleSaveScheduleEdit}
                          disabled={scheduleSaving}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                        >
                          {scheduleSaving ? "Guardando..." : "Guardar horario"}
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelScheduleEdit}
                          disabled={scheduleSaving}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleStartScheduleEdit}
                        disabled={scheduleSaving}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                      >
                        Editar horario
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Sin horario activo. Crea un horario laboral para este
                    odontólogo.
                  </p>

                  {scheduleTimeFields({
                    start: {
                      id: "schedule-start",
                      value: scheduleStartTime,
                      onChange: setScheduleStartTime,
                    },
                    end: {
                      id: "schedule-end",
                      value: scheduleEndTime,
                      onChange: setScheduleEndTime,
                    },
                    breakStart: {
                      id: "schedule-break-start",
                      value: scheduleBreakStart,
                      onChange: setScheduleBreakStart,
                    },
                    breakEnd: {
                      id: "schedule-break-end",
                      value: scheduleBreakEnd,
                      onChange: setScheduleBreakEnd,
                    },
                    disabled: scheduleSaving,
                  })}

                  <button
                    type="button"
                    onClick={handleCreateSchedule}
                    disabled={scheduleSaving}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                  >
                    {scheduleSaving ? "Creando..." : "Crear horario"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =========================================
          Editar odontólogo
      ========================================= */}

      {editingDoctor && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Editar odontólogo: {editingDoctor.name}
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            Actualiza la información profesional del odontólogo.
          </p>

          {editError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {editError}
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label
                htmlFor="edit-doctor-name"
                className="mb-2 block font-semibold text-slate-700"
              >
                Nombre
              </label>
              <input
                id="edit-doctor-name"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className={inputClass}
                disabled={savingEdit}
              />
            </div>

            <div>
              <label
                htmlFor="edit-doctor-license"
                className="mb-2 block font-semibold text-slate-700"
              >
                Licencia profesional
              </label>
              <input
                id="edit-doctor-license"
                type="text"
                value={editLicense}
                onChange={(event) => setEditLicense(event.target.value)}
                className={inputClass}
                disabled={savingEdit}
              />
            </div>

            <div>
              <label
                htmlFor="edit-doctor-phone"
                className="mb-2 block font-semibold text-slate-700"
              >
                Teléfono
              </label>
              <input
                id="edit-doctor-phone"
                type="tel"
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                maxLength={20}
                className={inputClass}
                disabled={savingEdit}
              />
            </div>

            <div>
              <label
                htmlFor="edit-doctor-specialty"
                className="mb-2 block font-semibold text-slate-700"
              >
                Especialidad
              </label>
              {specialtySelect(
                "edit-doctor-specialty",
                editSpecialtyId,
                setEditSpecialtyId,
                savingEdit,
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
              >
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={savingEdit}
                className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

export default AdminDoctors;