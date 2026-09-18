import { useCallback, useEffect, useState } from "react";

import {
  createPatient,
  getPatientById,
  getPatients,
  updatePatient,
} from "../../services/patientService";
import { getAppointments } from "../../services/appointmentService";

const PAGE_LIMIT = 10;

const appointmentStatusLabels = {
  confirmed: "Confirmada",
  in_progress: "En atención",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const appointmentStatusTone = (status) => {
  switch (status) {
    case "confirmed":
      return "bg-primaryLight text-primary";
    case "in_progress":
      return "bg-amber-50 text-amber-600";
    case "completed":
      return "bg-emerald-50 text-emerald-600";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    case "no_show":
      return "bg-red-50 text-red-600";
    default:
      return "bg-slate-100 text-slate-500";
  }
};

const roleLabels = {
  patient: "Paciente",
  doctor: "Odontólogo",
  receptionist: "Recepción",
  admin: "Administrador",
};

const getErrorMessage = (error, fallbackMessage) => {
  const status = error.response?.status;
  const backendMessage = error.response?.data?.message;

  if (status === 403) {
    return "No tienes permisos para realizar esta acción.";
  }

  if (status === 404) {
    return "Paciente no encontrado.";
  }

  if (status === 409) {
    return "El correo electrónico ya está registrado.";
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

const formatDate = (date) =>
  new Date(date).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatDateTime = (dateTime) =>
  new Date(dateTime).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

function ReceptionPatients() {
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [patientAppointments, setPatientAppointments] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editMedicalNotes, setEditMedicalNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const loadPatients = useCallback(async (page, currentSearch) => {
    try {
      setLoading(true);
      setListError("");

      const data = await getPatients({
        search: currentSearch,
        page,
        limit: PAGE_LIMIT,
      });

      setPatients(data.patients || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error al obtener los pacientes:", error);

      setPatients([]);
      setListError(
        getErrorMessage(error, "No fue posible cargar los pacientes."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadPatients(1, "");
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadPatients]);

  const closeDetail = () => {
    setSelectedPatient(null);
    setDetailError("");
    setEditError("");
    setEditSuccess("");
    setIsEditing(false);
    setPatientAppointments([]);
  };

  useEffect(() => {
    if (!selectedPatient) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDetail();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const loadPatientAppointments = async (patientId) => {
    try {
      const data = await getAppointments({
        patientId,
        page: "1",
        limit: "10",
      });

      const sorted = (data.appointments || [])
        .slice()
        .sort(
          (first, second) =>
            new Date(second.dateTime) - new Date(first.dateTime),
        );

      setPatientAppointments(sorted);
    } catch (error) {
      console.error("Error al obtener las citas del paciente:", error);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    const normalizedSearch = search.trim();

    setAppliedSearch(normalizedSearch);
    setPagination((currentPagination) => ({
      ...currentPagination,
      page: 1,
    }));
    setSelectedPatient(null);
    setDetailError("");

    await loadPatients(1, normalizedSearch);
  };

  const handlePageChange = async (page) => {
    if (page < 1 || page > pagination.pages || loading) {
      return;
    }

    setSelectedPatient(null);
    setDetailError("");
    await loadPatients(page, appliedSearch);
  };

  const handleCreatePatient = async (event) => {
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

    if (!normalizedEmail) {
      setFormError("El correo electrónico es obligatorio.");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setFormError("El correo electrónico no tiene un formato válido.");
      return;
    }

    try {
      setCreating(true);

      const data = await createPatient({
        name: normalizedName,
        email: normalizedEmail,
      });

      setName("");
      setEmail("");
      setSuccessMessage(data.message || "Paciente creado correctamente.");
      setSelectedPatient(null);
      setDetailError("");

      await loadPatients(1, appliedSearch);
    } catch (error) {
      console.error("Error al crear el paciente:", error);

      setFormError(
        getErrorMessage(error, "No fue posible crear el paciente."),
      );
    } finally {
      setCreating(false);
    }
  };

  const handleViewPatient = async (patientId) => {
    try {
      setDetailLoading(true);
      setDetailError("");
      setSelectedPatient(null);
      setIsEditing(false);
      setEditError("");
      setEditSuccess("");
      setPatientAppointments([]);

      const data = await getPatientById(patientId);

      setSelectedPatient(data.patient);

      await loadPatientAppointments(patientId);
    } catch (error) {
      console.error("Error al obtener el paciente:", error);

      setDetailError(
        getErrorMessage(
          error,
          "No fue posible cargar la información del paciente.",
        ),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // =====================================================
  // Editar datos básicos del paciente
  // =====================================================

  const handleStartEdit = () => {
    setEditName(selectedPatient.name || "");
    setEditPhone(selectedPatient.phone || "");
    setEditAllergies(selectedPatient.allergies || "");
    setEditMedicalNotes(selectedPatient.medicalNotes || "");
    setEditError("");
    setEditSuccess("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
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

    try {
      setSavingEdit(true);

      const data = await updatePatient(selectedPatient._id, {
        name: normalizedName,
        phone: editPhone.trim(),
        allergies: editAllergies.trim(),
        medicalNotes: editMedicalNotes.trim(),
      });

      setSelectedPatient(data.patient);
      setIsEditing(false);
      setEditSuccess(
        data.message || "Paciente actualizado correctamente.",
      );

      await loadPatients(pagination.page, appliedSearch);
    } catch (error) {
      console.error("Error al actualizar el paciente:", error);

      setEditError(
        getErrorMessage(
          error,
          "No fue posible actualizar el paciente.",
        ),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">
          Gestión de pacientes
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Pacientes
        </h1>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        {/* =========================================
            Registrar paciente
        ========================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Registrar paciente
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            Crea el registro básico del paciente.
          </p>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleCreatePatient} className="space-y-4">
            <div>
              <label
                htmlFor="patient-name"
                className="mb-2 block font-semibold text-slate-700"
              >
                Nombre
              </label>
              <input
                id="patient-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                disabled={creating}
              />
            </div>

            <div>
              <label
                htmlFor="patient-email"
                className="mb-2 block font-semibold text-slate-700"
              >
                Correo electrónico
              </label>
              <input
                id="patient-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                disabled={creating}
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              {creating ? "Registrando..." : "Registrar paciente"}
            </button>
          </form>
        </section>

        {/* =========================================
            Listado de pacientes
        ========================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] xl:col-span-2">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-title text-lg font-semibold text-slate-800">
                Listado de pacientes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {pagination.total} paciente{pagination.total === 1 ? "" : "s"} registrado{pagination.total === 1 ? "" : "s"}.
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, correo o teléfono"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none md:w-72"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
              >
                Buscar
              </button>
            </form>
          </div>

          {listError && (
            <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {listError}
            </div>
          )}

          {loading ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              Cargando pacientes...
            </p>
          ) : patients.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-medium text-slate-700">
                {appliedSearch
                  ? "No se encontraron pacientes con esa búsqueda."
                  : "No hay pacientes registrados."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3 font-semibold">Paciente</th>
                      <th className="px-4 py-3 font-semibold">Teléfono</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr
                        key={patient._id}
                        className="border-b last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primaryLight font-title text-sm font-semibold text-primary">
                              {initialsOf(patient.name)}
                            </span>

                            <div>
                              <p className="font-medium text-slate-800">
                                {patient.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {patient.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {patient.phone || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              patient.active
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {patient.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewPatient(patient._id)}
                            disabled={detailLoading}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <p className="text-sm text-slate-500">
                    Página {pagination.page} de {pagination.pages}
                  </p>

                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages || loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* =========================================
          Modal de detalle del paciente
      ========================================= */}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <p className="rounded-2xl bg-white px-6 py-4 text-sm font-medium text-slate-700">
            Cargando información del paciente...
          </p>
        </div>
      )}

      {detailError && !selectedPatient && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {detailError}
        </div>
      )}

      {selectedPatient && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
          onClick={closeDetail}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-primaryLight/50 to-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-title text-sm font-semibold text-white">
                  {initialsOf(selectedPatient.name)}
                </div>

                <div>
                  <p className="font-title text-lg font-semibold text-slate-800">
                    {selectedPatient.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    {selectedPatient.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={closeDetail}
                  aria-label="Cerrar"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>

                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedPatient.active
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {selectedPatient.active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              {editSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {editSuccess}
                </div>
              )}

              {!isEditing && (
                <>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Correo electrónico
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {selectedPatient.email || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Teléfono
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {selectedPatient.phone || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      className={`rounded-xl px-4 py-3 ${
                        selectedPatient.allergies
                          ? "border border-amber-200 bg-amber-50"
                          : "bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Alergias
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedPatient.allergies || "Sin alergias registradas"}
                      </p>
                    </div>

                    <div
                      className={`rounded-xl px-4 py-3 ${
                        selectedPatient.medicalNotes
                          ? "border border-amber-200 bg-amber-50"
                          : "bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Observaciones médicas
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedPatient.medicalNotes ||
                          "Sin observaciones registradas"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Rol
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {roleLabels[selectedPatient.role] ??
                          selectedPatient.role}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Creado
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatDate(selectedPatient.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                    >
                      Editar datos
                    </button>
                  </div>
                </>
              )}

              {isEditing && (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  {editError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {editError}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="edit-name"
                      className="mb-2 block font-semibold text-slate-700"
                    >
                      Nombre
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      disabled={savingEdit}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-phone"
                      className="mb-2 block font-semibold text-slate-700"
                    >
                      Teléfono
                    </label>
                    <input
                      id="edit-phone"
                      type="tel"
                      value={editPhone}
                      onChange={(event) => setEditPhone(event.target.value)}
                      maxLength={20}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      disabled={savingEdit}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-allergies"
                      className="mb-2 block font-semibold text-slate-700"
                    >
                      Alergias
                    </label>
                    <textarea
                      id="edit-allergies"
                      value={editAllergies}
                      onChange={(event) =>
                        setEditAllergies(event.target.value)
                      }
                      maxLength={300}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      disabled={savingEdit}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-medical-notes"
                      className="mb-2 block font-semibold text-slate-700"
                    >
                      Observaciones médicas
                    </label>
                    <textarea
                      id="edit-medical-notes"
                      value={editMedicalNotes}
                      onChange={(event) =>
                        setEditMedicalNotes(event.target.value)
                      }
                      maxLength={1000}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      disabled={savingEdit}
                    />
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
              )}

              {/* Citas del paciente */}
              <div className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-title text-base font-semibold text-slate-800">
                    Citas del paciente
                  </h3>

                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                    Últimas {patientAppointments.length}
                  </span>
                </div>

                {patientAppointments.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Sin citas registradas.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {patientAppointments.map((appointment) => (
                      <li key={appointment._id} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-800">
                            {formatDateTime(appointment.dateTime)}
                          </p>

                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              appointmentStatusTone(appointment.status)
                            }`}
                          >
                            {appointmentStatusLabels[appointment.status] ??
                              appointment.status}
                          </span>
                        </div>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {appointment.serviceSnapshot?.name ??
                            "Servicio no registrado"}{" "}
                          · {appointment.doctor?.name ?? "Odontólogo"}
                        </p>

                        {appointment.reason && (
                          <p className="mt-1 text-xs text-slate-500">
                            Motivo: {appointment.reason}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceptionPatients;