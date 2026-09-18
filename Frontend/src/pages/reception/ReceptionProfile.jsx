import { useContext, useEffect, useState } from "react";

import {
  getMyProfile,
  updateMyProfile,
} from "../../services/userService";

import { AuthContext } from "../../context/AuthContext";

const roleLabels = {
  patient: "Paciente",
  doctor: "Odontólogo",
  receptionist: "Recepción",
  admin: "Administrador",
};

const initialsOf = (name) =>
  (name || "")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function ReceptionProfile() {
  const { updateUser } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getMyProfile();

        setProfile(data.user);
        setName(data.user.name || "");
      } catch (loadError) {
        console.error("Error al obtener el perfil de recepción:", loadError);

        setError(
          loadError.response?.data?.message ||
            "No fue posible cargar el perfil.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    try {
      setSaving(true);

      const data = await updateMyProfile({
        name: name.trim(),
      });

      setProfile(data.user);
      setName(data.user.name || "");

      updateUser({ name: data.user.name });

      setSuccessMessage(
        data.message || "Perfil actualizado correctamente.",
      );

      setEditing(false);
    } catch (saveError) {
      console.error("Error al actualizar el perfil:", saveError);

      setError(
        saveError.response?.data?.message ||
          "No fue posible actualizar el perfil.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setError("");
    setSuccessMessage("");

    if (profile) {
      setName(profile.name || "");
    }
  };

  if (loading) {
    return <p>Cargando perfil...</p>;
  }

  if (error && !profile) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          Tu información personal
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Mi perfil
        </h1>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      {profile && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-br from-primaryLight/50 to-white px-6 py-6 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary font-title text-xl font-semibold text-white shadow-sm">
              {initialsOf(profile.name)}
            </div>

            <div className="flex-1">
              <h2 className="font-title text-2xl font-semibold text-slate-800">
                {profile.name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {profile.email}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primaryLight px-3 py-1 text-xs font-semibold text-primary">
                  {roleLabels[profile.role] ?? profile.role}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    profile.active
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {profile.active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          {!editing && (
            <div className="px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Correo electrónico
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {profile.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Teléfono
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {profile.phone || "—"}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Editar perfil
                </button>
              </div>
            </div>
          )}

          {editing && (
            <form onSubmit={handleSubmit} className="px-6 py-6">
              <fieldset className="rounded-xl border border-slate-200 p-5">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Datos básicos
                </legend>

                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block font-semibold text-slate-700"
                  >
                    Nombre
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                  />
                </div>
              </fieldset>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default ReceptionProfile;