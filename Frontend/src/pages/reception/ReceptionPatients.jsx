import { useCallback, useEffect, useState } from "react";

import {
  createPatient,
  getPatientById,
  getPatients,
} from "../../services/patientService";

const PAGE_LIMIT = 10;

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

const formatDate = (date) =>
  new Date(date).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
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

      const data = await getPatientById(patientId);

      setSelectedPatient(data.patient);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pacientes</h1>
        <p className="mt-2 text-gray-700">
          Busca, registra y consulta pacientes de la clínica.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="border rounded-lg p-6 bg-white xl:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Registrar paciente</h2>

          {formError && <p className="mb-4 text-red-600">{formError}</p>}

          {successMessage && (
            <p className="mb-4 font-semibold text-green-700">
              {successMessage}
            </p>
          )}

          <form onSubmit={handleCreatePatient} className="space-y-4">
            <div>
              <label htmlFor="patient-name" className="block font-semibold mb-2">
                Nombre
              </label>
              <input
                id="patient-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full border rounded-lg px-4 py-2"
                disabled={creating}
              />
            </div>

            <div>
              <label htmlFor="patient-email" className="block font-semibold mb-2">
                Correo electrónico
              </label>
              <input
                id="patient-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border rounded-lg px-4 py-2"
                disabled={creating}
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="border rounded-lg px-6 py-2 bg-blue-700 text-white disabled:opacity-50"
            >
              {creating ? "Registrando..." : "Registrar paciente"}
            </button>
          </form>
        </section>

        <section className="border rounded-lg p-6 bg-white xl:col-span-2">
          <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Listado de pacientes</h2>
              <p className="text-sm text-gray-600">
                {pagination.total} paciente{pagination.total === 1 ? "" : "s"} registrado{pagination.total === 1 ? "" : "s"}.
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o correo"
                className="w-full border rounded-lg px-4 py-2"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="border rounded-lg px-4 py-2 bg-blue-700 text-white disabled:opacity-50"
              >
                Buscar
              </button>
            </form>
          </div>

          {listError && <p className="mb-4 text-red-600">{listError}</p>}

          {loading ? (
            <p>Cargando pacientes...</p>
          ) : patients.length === 0 ? (
            <p>
              {appliedSearch
                ? "No se encontraron pacientes con esa búsqueda."
                : "No hay pacientes registrados."}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-3 font-semibold">Nombre</th>
                      <th className="px-3 py-3 font-semibold">Correo electrónico</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-3 py-3 font-semibold">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient._id} className="border-b last:border-b-0">
                        <td className="px-3 py-3">{patient.name}</td>
                        <td className="px-3 py-3">{patient.email}</td>
                        <td className="px-3 py-3">
                          {patient.active ? "Activo" : "Inactivo"}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleViewPatient(patient._id)}
                            disabled={detailLoading}
                            className="border rounded-lg px-4 py-2 bg-blue-700 text-white disabled:opacity-50"
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
                <div className="mt-6 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                    className="border rounded-lg px-4 py-2 bg-white disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <p>
                    Página {pagination.page} de {pagination.pages}
                  </p>

                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages || loading}
                    className="border rounded-lg px-4 py-2 bg-white disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <section className="mt-6 border rounded-lg p-6 bg-white max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Detalle del paciente</h2>

        {detailLoading && <p>Cargando información del paciente...</p>}

        {detailError && <p className="text-red-600">{detailError}</p>}

        {!detailLoading && !detailError && !selectedPatient && (
          <p>Selecciona un paciente del listado para consultar su información.</p>
        )}

        {selectedPatient && (
          <div className="space-y-3">
            <div>
              <p className="font-semibold">Nombre</p>
              <p>{selectedPatient.name}</p>
            </div>
            <div>
              <p className="font-semibold">Correo electrónico</p>
              <p>{selectedPatient.email}</p>
            </div>
            <div>
              <p className="font-semibold">Rol</p>
              <p>{selectedPatient.role}</p>
            </div>
            <div>
              <p className="font-semibold">Estado</p>
              <p>{selectedPatient.active ? "Activo" : "Inactivo"}</p>
            </div>
            <div>
              <p className="font-semibold">Fecha de creación</p>
              <p>{formatDate(selectedPatient.createdAt)}</p>
            </div>
            <div>
              <p className="font-semibold">Última actualización</p>
              <p>{formatDate(selectedPatient.updatedAt)}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default ReceptionPatients;
