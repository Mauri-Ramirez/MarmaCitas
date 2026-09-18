import { useCallback, useEffect, useState } from "react";

import {
  createService,
  deactivateService,
  getServices,
  updateService,
} from "../../services/serviceService";
import { getSpecialties } from "../../services/specialtyService";

const getErrorMessage = (error, fallbackMessage) => {
  const status = error.response?.status;
  const backendMessage = error.response?.data?.message;

  if (status === 403) {
    return "No tienes permisos para realizar esta acción.";
  }

  if (status === 404) {
    return "Servicio no encontrado.";
  }

  return backendMessage || fallbackMessage;
};

function AdminServices({ embedded = false } = {}) {
  const [services, setServices] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingService, setEditingService] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editSpecialtyId, setEditSpecialtyId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setListError("");

      const [servicesData, specialtiesData] = await Promise.all([
        getServices(),
        getSpecialties(),
      ]);

      setServices(servicesData);
      setSpecialties(specialtiesData);
    } catch (error) {
      console.error("Error al cargar los servicios:", error);

      setServices([]);
      setListError(
        getErrorMessage(error, "No fue posible cargar los servicios."),
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

  const buildServicePayload = (values) => ({
    name: values.name.trim(),
    description: values.description.trim(),
    duration: Number(values.duration),
    price: Number(values.price),
    specialty: values.specialtyId,
  });

  const validateServiceForm = (values, setError) => {
    if (!values.name.trim()) {
      setError("El nombre es obligatorio.");
      return false;
    }

    if (!values.specialtyId) {
      setError("Selecciona una especialidad.");
      return false;
    }

    if (!values.duration || Number(values.duration) < 1) {
      setError("La duración debe ser mayor que cero.");
      return false;
    }

    if (!values.price || Number(values.price) < 1) {
      setError("El precio debe ser mayor que cero.");
      return false;
    }

    return true;
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    const values = { name, description, duration, price, specialtyId };

    if (!validateServiceForm(values, setFormError)) {
      return;
    }

    try {
      setCreating(true);

      const data = await createService(buildServicePayload(values));

      setName("");
      setDescription("");
      setDuration("");
      setPrice("");
      setSpecialtyId("");
      setSuccessMessage(data.message || "Servicio creado correctamente.");

      await loadData();
    } catch (error) {
      console.error("Error al crear el servicio:", error);

      setFormError(
        getErrorMessage(error, "No fue posible crear el servicio."),
      );
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (service) => {
    setEditingService(service);
    setEditName(service.name || "");
    setEditDescription(service.description || "");
    setEditDuration(String(service.duration || ""));
    setEditPrice(String(service.price || ""));
    setEditSpecialtyId(service.specialty?._id || "");
    setEditError("");
    setSuccessMessage("");
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setEditError("");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    setEditError("");

    const values = {
      name: editName,
      description: editDescription,
      duration: editDuration,
      price: editPrice,
      specialtyId: editSpecialtyId,
    };

    if (!validateServiceForm(values, setEditError)) {
      return;
    }

    try {
      setSavingEdit(true);

      const data = await updateService(
        editingService._id,
        buildServicePayload(values),
      );

      setEditingService(null);
      setSuccessMessage(
        data.message || "Servicio actualizado correctamente.",
      );

      await loadData();
    } catch (error) {
      console.error("Error al actualizar el servicio:", error);

      setEditError(
        getErrorMessage(error, "No fue posible actualizar el servicio."),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeactivate = async (service) => {
    if (!window.confirm(`¿Deseas desactivar el servicio "${service.name}"?`)) {
      return;
    }

    try {
      const data = await deactivateService(service._id);

      setSuccessMessage(
        data.message || "Servicio desactivado correctamente.",
      );

      if (editingService?._id === service._id) {
        setEditingService(null);
      }

      await loadData();
    } catch (error) {
      console.error("Error al desactivar el servicio:", error);

      setListError(
        getErrorMessage(error, "No fue posible desactivar el servicio."),
      );
    }
  };

  const specialtySelect = (id, value, onChange, disabled) => (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
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

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";

  return (
    <div>
      {!embedded && (
        <div className="mb-6">
          <h1 className="font-title text-3xl font-semibold text-slate-800">
            Servicios
          </h1>
          <p className="mt-2 text-slate-500">
            Crea, edita y desactiva los servicios de la clínica.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] xl:col-span-1">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Crear servicio
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            Registra un nuevo servicio de la clínica.
          </p>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label
                htmlFor="service-name"
                className="mb-2 block font-semibold text-slate-700"
              >
                Nombre
              </label>
              <input
                id="service-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                className={inputClass}
                disabled={creating}
              />
            </div>

            <div>
              <label
                htmlFor="service-description"
                className="mb-2 block font-semibold text-slate-700"
              >
                Descripción
              </label>
              <textarea
                id="service-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={300}
                rows={3}
                className={inputClass}
                disabled={creating}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="service-duration"
                  className="mb-2 block font-semibold text-slate-700"
                >
                  Duración (min)
                </label>
                <input
                  id="service-duration"
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className={inputClass}
                  disabled={creating}
                />
              </div>

              <div>
                <label
                  htmlFor="service-price"
                  className="mb-2 block font-semibold text-slate-700"
                >
                  Precio
                </label>
                <input
                  id="service-price"
                  type="number"
                  min="1"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className={inputClass}
                  disabled={creating}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="service-specialty"
                className="mb-2 block font-semibold text-slate-700"
              >
                Especialidad
              </label>
              {specialtySelect(
                "service-specialty",
                specialtyId,
                setSpecialtyId,
                creating,
              )}
            </div>

            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              {creating ? "Creando..." : "Crear servicio"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] xl:col-span-2">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-title text-lg font-semibold text-slate-800">
              Listado de servicios
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {services.length} servicio{services.length === 1 ? "" : "s"}{" "}
              activo{services.length === 1 ? "" : "s"}.
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
              Cargando servicios...
            </p>
          ) : services.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-medium text-slate-700">
                No hay servicios activos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-semibold">Nombre</th>
                    <th className="px-4 py-3 font-semibold">Especialidad</th>
                    <th className="px-4 py-3 font-semibold">Duración</th>
                    <th className="px-4 py-3 font-semibold">Precio</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr
                      key={service._id}
                      className="border-b last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {service.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {service.specialty?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {service.duration} min
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        ${service.price}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(service)}
                            disabled={savingEdit}
                            className="rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeactivate(service)}
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

      {editingService && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="mb-1 font-title text-lg font-semibold text-slate-800">
            Editar servicio: {editingService.name}
          </h2>

          <p className="mb-5 text-sm text-slate-500">
            Actualiza la información del servicio.
          </p>

          {editError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {editError}
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label
                htmlFor="edit-service-name"
                className="mb-2 block font-semibold text-slate-700"
              >
                Nombre
              </label>
              <input
                id="edit-service-name"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                maxLength={100}
                className={inputClass}
                disabled={savingEdit}
              />
            </div>

            <div>
              <label
                htmlFor="edit-service-description"
                className="mb-2 block font-semibold text-slate-700"
              >
                Descripción
              </label>
              <textarea
                id="edit-service-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                maxLength={300}
                rows={3}
                className={inputClass}
                disabled={savingEdit}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-service-duration"
                  className="mb-2 block font-semibold text-slate-700"
                >
                  Duración (min)
                </label>
                <input
                  id="edit-service-duration"
                  type="number"
                  min="1"
                  value={editDuration}
                  onChange={(event) => setEditDuration(event.target.value)}
                  className={inputClass}
                  disabled={savingEdit}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-service-price"
                  className="mb-2 block font-semibold text-slate-700"
                >
                  Precio
                </label>
                <input
                  id="edit-service-price"
                  type="number"
                  min="1"
                  value={editPrice}
                  onChange={(event) => setEditPrice(event.target.value)}
                  className={inputClass}
                  disabled={savingEdit}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-service-specialty"
                className="mb-2 block font-semibold text-slate-700"
              >
                Especialidad
              </label>
              {specialtySelect(
                "edit-service-specialty",
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

export default AdminServices;
