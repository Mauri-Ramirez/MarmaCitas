import { useCallback, useContext, useEffect, useState } from "react";

import { getUsers, setUserActive } from "../../services/userService";
import {
  getPatientById,
  updatePatient,
} from "../../services/patientService";
import { AuthContext } from "../../context/AuthContext";

const PAGE_LIMIT = 10;

const roleLabels = {
  patient: "Paciente",
  doctor: "Odontólogo",
  receptionist: "Recepción",
  admin: "Administrador",
};

const roleTone = (role) => {
  switch (role) {
    case "patient":
      return "bg-primaryLight text-primary";
    case "doctor":
      return "bg-emerald-50 text-emerald-600";
    case "receptionist":
      return "bg-amber-50 text-amber-600";
    case "admin":
      return "bg-violet-50 text-violet-600";
    default:
      return "bg-slate-100 text-slate-500";
  }
};

const getErrorMessage = (error, fallbackMessage) => {
  const status = error.response?.status;
  const backendMessage = error.response?.data?.message;

  if (status === 403) {
    return "No tienes permisos para realizar esta acción.";
  }

  return backendMessage || fallbackMessage;
};

const buildQueryParams = (filters, page) => {
  const params = { page, limit: PAGE_LIMIT };

  if (filters.role) {
    params.role = filters.role;
  }

  if (filters.search) {
    params.search = filters.search;
  }

  return params;
};

const INITIAL_FILTERS = {
  role: "",
  search: "",
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

function AdminUsers() {
  const { user: currentUser } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [filterRole, setFilterRole] = useState(INITIAL_FILTERS.role);
  const [search, setSearch] = useState(INITIAL_FILTERS.search);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailError, setDetailError] = useState("");

  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editMedicalNotes, setEditMedicalNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [togglingUserId, setTogglingUserId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadUsers = useCallback(async (page, filters) => {
    try {
      setLoading(true);
      setListError("");

      const data = await getUsers(buildQueryParams(filters, page));

      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error al obtener los usuarios:", error);

      setUsers([]);
      setListError(
        getErrorMessage(error, "No fue posible cargar los usuarios."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadUsers(1, INITIAL_FILTERS);
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadUsers]);

  const closeDetail = () => {
    setSelectedUser(null);
    setDetailError("");
    setIsEditingPatient(false);
    setEditError("");
    setActionError("");
  };

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDetail();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedUser]);

  const handleApplyFilters = async (event) => {
    event.preventDefault();

    const filters = {
      role: filterRole,
      search: search.trim(),
    };

    setAppliedFilters(filters);

    await loadUsers(1, filters);
  };

  const handleClearFilters = async () => {
    setFilterRole("");
    setSearch("");

    const filters = { ...INITIAL_FILTERS };

    setAppliedFilters(filters);

    await loadUsers(1, filters);
  };

  const handlePageChange = async (page) => {
    if (page < 1 || page > pagination.pages || loading) {
      return;
    }

    await loadUsers(page, appliedFilters);
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setDetailError("");
    setActionError("");
    setIsEditingPatient(false);
    setEditError("");
    setSuccessMessage("");

    if (user.role === "patient") {
      try {
        const data = await getPatientById(user._id);

        setSelectedUser(data.patient);
      } catch (error) {
        setDetailError(
          getErrorMessage(
            error,
            "No fue posible cargar la información del paciente.",
          ),
        );
      }
    }
  };

  const handleStartEditPatient = () => {
    setEditName(selectedUser.name || "");
    setEditPhone(selectedUser.phone || "");
    setEditAllergies(selectedUser.allergies || "");
    setEditMedicalNotes(selectedUser.medicalNotes || "");
    setEditError("");
    setIsEditingPatient(true);
  };

  const handleEditUser = async (user) => {
    setSelectedUser(user);
    setDetailError("");
    setActionError("");
    setIsEditingPatient(false);
    setEditError("");
    setSuccessMessage("");

    if (user.role === "patient") {
      try {
        const data = await getPatientById(user._id);

        const patient = data.patient;

        setSelectedUser(patient);
        setEditName(patient.name || "");
        setEditPhone(patient.phone || "");
        setEditAllergies(patient.allergies || "");
        setEditMedicalNotes(patient.medicalNotes || "");
        setEditError("");
        setIsEditingPatient(true);
      } catch (error) {
        setDetailError(
          getErrorMessage(
            error,
            "No fue posible cargar la información del paciente.",
          ),
        );
      }
    }
  };

  const handleCancelEditPatient = () => {
    setIsEditingPatient(false);
    setEditError("");
  };

  const handleSavePatientEdit = async (event) => {
    event.preventDefault();

    setEditError("");

    const normalizedName = editName.trim();

    if (!normalizedName) {
      setEditError("El nombre es obligatorio.");
      return;
    }

    try {
      setSavingEdit(true);

      const data = await updatePatient(selectedUser._id, {
        name: normalizedName,
        phone: editPhone.trim(),
        allergies: editAllergies.trim(),
        medicalNotes: editMedicalNotes.trim(),
      });

      setSelectedUser(data.patient);
      setIsEditingPatient(false);
      setSuccessMessage(
        data.message || "Paciente actualizado correctamente.",
      );

      await loadUsers(pagination.page, appliedFilters);
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

  const handleToggleActive = async (user) => {
    const targetState = !user.active;

    const message = targetState
      ? `¿Deseas reactivar al usuario "${user.name}"?`
      : `¿Deseas desactivar al usuario "${user.name}"?`;

    if (!window.confirm(message)) {
      return;
    }

    try {
      setTogglingUserId(user._id);
      setActionError("");
      setSuccessMessage("");

      const data = await setUserActive(user._id, targetState);

      setSuccessMessage(data.message || "Estado actualizado.");

      if (selectedUser?._id === user._id) {
        setSelectedUser({ ...selectedUser, active: targetState });
      }

      await loadUsers(pagination.page, appliedFilters);
    } catch (error) {
      console.error("Error al actualizar el estado:", error);

      setActionError(
        getErrorMessage(
          error,
          "No fue posible actualizar el estado del usuario.",
        ),
      );
    } finally {
      setTogglingUserId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">
          Usuarios de la clínica
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Usuarios
        </h1>
      </div>

      {actionError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {actionError}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <form
          onSubmit={handleApplyFilters}
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="filter-search"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Nombre o correo
            </label>
            <input
              id="filter-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o correo"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              disabled={loading}
            />
          </div>

          <div className="md:w-56">
            <label
              htmlFor="filter-role"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Rol
            </label>
            <select
              id="filter-role"
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              disabled={loading}
            >
              <option value="">Todos</option>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              Buscar
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-500">
            {pagination.total} usuario{pagination.total === 1 ? "" : "s"}
            registrado{pagination.total === 1 ? "" : "s"}.
          </p>
        </div>

        {listError && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {listError}
          </div>
        )}

        {loading ? (
          <p className="px-6 py-8 text-sm text-slate-500">
            Cargando usuarios...
          </p>
        ) : users.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-medium text-slate-700">
              No se encontraron usuarios con los filtros aplicados.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Rol</th>
                    <th className="px-4 py-3 font-semibold">Especialidad</th>
                    <th className="px-4 py-3 font-semibold">Teléfono</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = String(user._id) === String(currentUser?._id);

                    return (
                      <tr
                        key={user._id}
                        className="border-b last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primaryLight font-title text-sm font-semibold text-primary">
                              {initialsOf(user.name)}
                            </span>

                            <div>
                              <p className="font-medium text-slate-800">
                                {user.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              roleTone(user.role)
                            }`}
                          >
                            {roleLabels[user.role] ?? user.role}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {user.specialty?.name ?? "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {user.phone || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              user.active
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {user.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewUser(user)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Ver
                            </button>

                            {user.role === "patient" && (
                              <button
                                type="button"
                                onClick={() => handleEditUser(user)}
                                className="rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                              >
                                Editar
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleActive(user)}
                              disabled={isSelf || togglingUserId === user._id}
                              title={
                                isSelf
                                  ? "No puedes cambiar tu propio estado"
                                  : undefined
                              }
                              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${
                                user.active
                                  ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {user.active ? "Desactivar" : "Reactivar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* =========================================
          Modal de detalle del usuario
      ========================================= */}

      {selectedUser && (
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
                  {initialsOf(selectedUser.name)}
                </div>

                <div>
                  <p className="font-title text-lg font-semibold text-slate-800">
                    {selectedUser.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    {selectedUser.email}
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

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      roleTone(selectedUser.role)
                    }`}
                  >
                    {roleLabels[selectedUser.role] ?? selectedUser.role}
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      selectedUser.active
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {selectedUser.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              {detailError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {detailError}
                </div>
              )}

              {!isEditingPatient && (
                <>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Correo electrónico
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {selectedUser.email || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Teléfono
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {selectedUser.phone || "—"}
                      </p>
                    </div>

                    {selectedUser.role === "doctor" && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Licencia profesional
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {selectedUser.professionalLicense || "—"}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Especialidad
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {selectedUser.specialty?.name ?? "—"}
                      </p>
                    </div>
                  </div>

                  {selectedUser.role === "patient" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div
                        className={`rounded-xl px-4 py-3 ${
                          selectedUser.allergies
                            ? "border border-amber-200 bg-amber-50"
                            : "bg-slate-50"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Alergias
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {selectedUser.allergies ||
                            "Sin alergias registradas"}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl px-4 py-3 ${
                          selectedUser.medicalNotes
                            ? "border border-amber-200 bg-amber-50"
                            : "bg-slate-50"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Observaciones médicas
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {selectedUser.medicalNotes ||
                            "Sin observaciones registradas"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Creado
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatDate(selectedUser.createdAt)}
                      </p>
                    </div>
                  </div>

                  {selectedUser.role === "patient" && (
                    <div className="border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={handleStartEditPatient}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                      >
                        Editar paciente
                      </button>
                    </div>
                  )}

                  {selectedUser.role === "doctor" && (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      La información profesional del odontólogo se gestiona
                      desde Odontólogos. Aquí solo puedes cambiar su estado de
                      actividad.
                    </p>
                  )}
                </>
              )}

              {isEditingPatient && (
                <form onSubmit={handleSavePatientEdit} className="space-y-4">
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
                      onChange={(event) => setEditAllergies(event.target.value)}
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
                      onClick={handleCancelEditPatient}
                      disabled={savingEdit}
                      className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;