# MarmaCitas — Frontend

Guía breve del frontend real (React + Vite + Tailwind CSS 4).

## Stack

- React 19, Vite, Tailwind CSS 4, React Router, Axios, react-day-picker.

## Estructura principal

```
src/
  api/          -> instancia Axios (baseURL desde VITE_API_URL)
  context/      -> AuthContext (sesión, login, logout, updateUser)
  routes/       -> AppRouter (rutas) y PrivateRoute (protección por rol)
  layouts/      -> layouts por rol y público
  components/   -> componentes compartidos (navegación, home, citas, common)
  pages/        -> páginas por rol (patient, doctor, receptionist, admin, public)
  services/     -> capa HTTP por recurso
  hooks/        -> useAppointmentAvailability
```

## Rutas por rol

- **Público:** `/`, `/login`, `/registro`.
- **Paciente:** `/paciente`, `/paciente/agendar`, `/paciente/citas`, `/paciente/perfil`.
- **Odontólogo:** `/odontologo`, `/odontologo/citas`, `/odontologo/perfil`.
- **Recepción:** `/recepcion`, `/recepcion/citas/agendar`, `/recepcion/citas`,
  `/recepcion/pacientes`, `/recepcion/odontologos`, `/recepcion/perfil`.
- **Admin:** `/admin`, `/admin/citas/agendar`, `/admin/usuarios`, `/admin/odontologos`,
  `/admin/catalogo`, `/admin/citas`, `/admin/perfil`.

## Autenticación y RBAC

- `AuthContext` restaura la sesión con `GET /users/me` y guarda el JWT en `localStorage`.
- `PrivateRoute` restringe rutas por rol (capa UX); el backend es la autoridad.
- El interceptor de Axios añade el token y limpia la sesión ante 401.

## Configuración de API

- Axios usa `import.meta.env.VITE_API_URL`. Para desarrollo local se define
  `VITE_API_URL=http://localhost:5000/api` en `Frontend/.env` (copiar desde `.env.example`).

## Ejecución

```bash
npm install
npm run dev     # Vite (puerto 5173)
```

## Verificaciones

```bash
npm run lint    # 0 errores (verificado)
npm run build   # build exitoso (verificado)
```