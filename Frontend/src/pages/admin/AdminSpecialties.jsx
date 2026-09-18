import { useCallback, useEffect, useState } from "react";

import {
  createSpecialty,
  deactivateSpecialty,
  getSpecialties,
  updateSpecialty,
} from "../../services/specialtyService";

const getErrorMessage = (error, fallbackMessage) => {
  const status = error.response?.status;
  const backendMessage = error.response?.data?.message;

  if (status === 403) {
    return "No tienes permisos para realizar esta acción.";
  }

  if (status === 404) {
    return "Especialidad no encontrada.";
  }

  return backendMessage || fallbackMessage;
};

function AdminSpecialties({ embedded = false } = {}) {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingSpecialty, setEditingSpecialty] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const loadSpecialties = useCallback(async () => {
    try {
      setLoading(true);
      setListError("");

      const data = await getSpecialties();

      setSpecialties(data);
    } catch (error) {
      console.error("Error al obtener las especialidades:", error);

      setSpecialties([]);
      setListError(
        getErrorMessage(
          error,
          "No fue posible cargar las especialidades.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadSpecialties();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadSpecialties]);

  const handleCreate = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    const normalizedName = name.trim();

    if (!normalizedName) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    try {
      setCreating(true);

      const data = await createSpecialty({
        name: normalizedName,
        description: description.trim(),
      });

      setName("");
      setDescription("");
      setSuccessMessage(
        data.message || "Especialidad creada correctamente.",
      );

      await loadSpecialties();
    } catch (error) {
      console.error("Error al crear la especialidad:", error);

      setFormError(
        getErrorMessage(error, "No fue posible crear la especialidad."),
      );
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (specialty) => {
    setEditingSpecialty(specialty);
    setEditName(specialty.name || "");
    setEditDescription(specialty.description || "");
    setEditError("");
    setSuccessMessage("");
  };

  const handleCancelEdit = () => {
    setEditingSpecialty(null);
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

      const data = await updateSpecialty(editingSpecialty._id, {
        name: normalizedName,
        description: editDescription.trim(),
      });

      setEditingSpecialty(null);
      setSuccessMessage(
        data.message || "Especialidad actualizada correctamente.",
      );

      await loadSpecialties();
    } catch (error) {
      console.error("Error al actualizar la especialidad:", error);

      setEditError(
        getErrorMessage(
          error,
          "No fue posible actualizar la especialidad.",
        ),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeactivate = async (specialty) => {
    if (!window.confirm(`¿Deseas desactivar la especialidad "${specialty.name}"?`)) {
      return;
    }

    try {
      const data = await deactivateSpecialty(specialty._id);

      setSuccessMessage(
        data.message || "Especialidad desactivada correctamente.",
      );

      if (editingSpecialty?._id === specialty._id) {
        setEditingSpecialty(null);
      }

      await loadSpecialties();
    } catch (error) {
      console.error("Error al desactivar la especialidad:", error);

      setListError(
        getErrorMessage(
          error,
          "No fue posible desactivar la especialidad.",
        ),
      );
    }
  };

  return (
    <div>
      {!embedded && (
        <div className="mb-6">
          <h1 className="font-title text-3xl font-semibold text-slate-800">
            Especialidades
          </h1>
          <p className="mt-2 text-slate-500">
            Crea, edita y desactiva las especialidades de la clínica.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] xl:col-span-1">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Crear especialidad
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            Registra una nueva especialidad.
          </p>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label
                htmlFor="specialty-name"
                className="mb-2 block font-semibold text-slate-700"
              >
                Nombre
              </label>
              <input
                id="specialty-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={50}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                disabled={creating}
              />
            </div>

            <div>
              <label
                htmlFor="specialty-description"
                className="mb-2 block font-semibold text-slate-700"
              >
                Descripción
              </label>
              <textarea
                id="specialty-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={300}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                disabled={creating}
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              {creating ? "Creando..." : "Crear especialidad"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] xl:col-span-2">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-title text-lg font-semibold text-slate-800">
              Listado de especialidades
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {specialties.length} especialidad
              {specialties.length === 1 ? "" : "es"} activa
              {specialties.length === 1 ? "" : "s"}.
            </p>
          </div>

          {successMessage && (
            <div className="mx-6 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </div>
          )}

          {listError && (
            <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {listError}
            </div>
          )}

          {loading ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              Cargando especialidades...
            </p>
          ) : specialties.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-medium text-slate-700">
                No hay especialidades activas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-semibold">Nombre</th>
                    <th className="px-4 py-3 font-semibold">Descripción</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {specialties.map((specialty) => (
                    <tr
                      key={specialty._id}
                      className="border-b last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {specialty.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {specialty.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(specialty)}
                            disabled={savingEdit}
                            className="rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeactivate(specialty)}
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

      {editingSpecialty && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Editar especialidad: {editingSpecialty.name}
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            Actualiza la información de la especialidad.
          </p>

          {editError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {editError}
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label
                htmlFor="edit-specialty-name"
                className="mb-2 block font-semibold text-slate-700"
              >
                Nombre
              </label>
              <input
                id="edit-specialty-name"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                maxLength={50}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                disabled={savingEdit}
              />
            </div>

            <div>
              <label
                htmlFor="edit-specialty-description"
                className="mb-2 block font-semibold text-slate-700"
              >
                Descripción
              </label>
              <textarea
                id="edit-specialty-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                maxLength={300}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
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
        </section>
      )}
    </div>
  );
}

export default AdminSpecialties;
