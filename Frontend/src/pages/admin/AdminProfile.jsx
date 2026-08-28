import { useEffect, useState } from "react";

import {
  getMyProfile,
  updateMyProfile,
} from "../../services/userService";

function AdminProfile() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getMyProfile();

        setProfile(data.user);
        setName(data.user.name || "");
      } catch (error) {
        console.error("Error al obtener el perfil de administrador:", error);

        setError(
          error.response?.data?.message ||
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
      setSuccessMessage(
        data.message || "Perfil actualizado correctamente.",
      );
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);

      setError(
        error.response?.data?.message ||
          "No fue posible actualizar el perfil.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Cargando perfil...</p>;
  }

  if (error && !profile) {
    return <p>{error}</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Mi perfil
      </h1>

      {error && (
        <p className="mb-4 text-red-600">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="mb-4 font-semibold">
          {successMessage}
        </p>
      )}

      {profile && (
        <div className="border rounded-lg p-6 bg-white max-w-xl">
          <div className="space-y-3 mb-6">
            <div>
              <p className="font-semibold">Nombre</p>
              <p>{profile.name}</p>
            </div>

            <div>
              <p className="font-semibold">Correo electrónico</p>
              <p>{profile.email}</p>
            </div>

            <div>
              <p className="font-semibold">Rol</p>
              <p>{profile.role}</p>
            </div>

            <div>
              <p className="font-semibold">Estado</p>
              <p>{profile.active ? "Activo" : "Inactivo"}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block font-semibold mb-2"
              >
                Nombre
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="border rounded-lg px-6 py-2 bg-blue-700 text-white disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminProfile;
