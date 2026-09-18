import { useEffect, useState } from "react";

import { getMyProfile } from "../../services/userService";
import { getMySchedule } from "../../services/scheduleService";

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

function DoctorProfile() {
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [noSchedule, setNoSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getMyProfile();

        setProfile(data.user);
      } catch (loadError) {
        console.error(
          "Error al obtener el perfil del odontólogo:",
          loadError,
        );

        setError(
          loadError.response?.data?.message ||
            "No fue posible cargar el perfil.",
        );
      } finally {
        setLoading(false);
      }
    };

    const loadSchedule = async () => {
      try {
        const data = await getMySchedule();

        setSchedule(data);
      } catch (loadError) {
        if (loadError.response?.status === 404) {
          setNoSchedule(true);
          return;
        }

        console.error("Error al obtener el horario:", loadError);
      }
    };

    loadProfile();
    loadSchedule();
  }, []);

  if (loading) {
    return <p>Cargando perfil...</p>;
  }

  if (error && !profile) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          Información profesional
        </p>

        <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
          Mi perfil profesional
        </h1>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          {/* =========================================
              Cabecera
          ========================================= */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-4 bg-gradient-to-br from-primaryLight/50 to-white px-6 py-6 sm:flex-row sm:items-center">
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

            <div className="px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Especialidad
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {profile.specialty?.name || "No registrada"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Licencia profesional
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {profile.professionalLicense || "No registrada"}
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

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Correo electrónico
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {profile.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================
              Horario laboral (integrado)
          ========================================= */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="font-title text-lg font-semibold text-slate-800">
                Horario laboral
              </h2>
            </div>

            {noSchedule || !schedule ? (
              <div className="px-6 py-6">
                <p className="text-sm text-slate-500">
                  No tienes un horario activo asignado.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Tu horario es administrado por la clínica.
                </p>
              </div>
            ) : (
              <div className="px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Jornada
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      Lunes a viernes
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Horario
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {schedule.startTime} — {schedule.endTime}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Pausa
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {schedule.breakStart && schedule.breakEnd
                        ? `${schedule.breakStart} — ${schedule.breakEnd}`
                        : "Sin pausa"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Estado
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {schedule.active ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                </div>

                <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-400">
                  Tu horario es administrado por la clínica.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorProfile;