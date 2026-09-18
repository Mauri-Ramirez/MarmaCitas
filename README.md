# MarmaCitas

Sistema web de gestión de citas odontológicas para un consultorio dental (proyecto académico SENA).

## Propósito

MarmaCitas permite a pacientes, odontólogos, recepción y administración gestionar citas odontológicas:
agendamiento, disponibilidad, atención, notas clínicas, adjuntos y administración del catálogo y del
personal. La autoridad funcional (permisos, disponibilidad y reglas de negocio) vive en el backend;
el frontend es una capa de interacción.

## Stack real

- **Backend:** Node.js (ESM) + Express 5 + Mongoose 9 + MongoDB (Atlas) + JWT + bcryptjs + Multer.
- **Frontend:** React 19 + Vite + Tailwind CSS 4 + React Router + Axios.
- **Zona horaria:** America/Bogota (la validación de jornada y la construcción de fechas la usan).

## Estructura general

```
Backend/
  config/      -> db, clinicSchedule (jornada clínica fija)
  controllers/ -> lógica de negocio por recurso
  models/      -> User, Specialty, Service, Schedule, Appointment
  routes/      -> auth, users, specialties, services, doctors, schedules, appointments
  middlewares/ -> auth (JWT), roles, upload de adjuntos
  scripts/     -> seedDemo, migraciones
  tests/       -> suites node:test
Frontend/
  src/
    api/        -> instancia Axios (VITE_API_URL)
    context/    -> AuthContext (sesión y login)
    routes/     -> rutas y PrivateRoute por rol
    layouts/, components/, pages/, services/, hooks/
```

## Requisitos

- Node.js ≥ 20.19 (lo exigen Mongoose 9 y Vite 8).
- MongoDB (replica set) para las operaciones transaccionales de citas.
- Copiar los archivos de ejemplo de entorno (no se comparten credenciales).

## Variables de entorno

- `Backend/.env.example` → copiar a `Backend/.env`:
  - `MONGO_URI` (cadena a la base `marmacitas`)
  - `JWT_SECRET` (secreto de firma)
  - `PORT` (opcional, 5000 por defecto)
  - `UPLOADS_DIR` (opcional; por defecto `Backend/uploads/appointments`)
- `Frontend/.env.example` → copiar a `Frontend/.env`:
  - `VITE_API_URL` (por defecto `http://localhost:5000/api` para desarrollo)

No modificar los `.env` reales ni exponer credenciales.

## Instalación y ejecución

Backend:

```bash
cd Backend
npm install
npm run dev          # arranca nodemon server.js
```

Frontend:

```bash
cd Frontend
npm install
npm run dev          # Vite (puerto 5173)
```

Accesos de demostración (creados con `seed:demo`): administrador, recepción, odontólogo y paciente
demo con credenciales definidas en `Backend/scripts/seedDemo.js`.

## Scripts y migraciones (Backend)

```bash
npm run seed:demo      # crea datos mínimos de demostración (idempotente)
npm run migrate:clinic # alinea la pausa 12-14 en horarios activos (migración histórica)
npm run migrate:notes  # migró el campo legacy `notes` a `reason` (conserva `notes` crudo en BD)
```

Nota operativa de `Schedule`: existe un índice único parcial `{ doctor: 1 }` con `active: true`. Si en
la base existiera un índice único global antiguo, debe eliminarse manualmente (dropIndex) para que
Mongoose cree el parcial.

## Pruebas

Backend (requiere MongoDB):

```bash
cd Backend
npm test
```

- **148/148 tests** en 14 suites (`node:test`), contra la base **`marmacitas_test`**.
- La suite de adjuntos usa un directorio aislado **`uploads-test`** y nunca toca los uploads reales.
- **Naturaleza destructiva:** las suites borran colecciones de `marmacitas_test` en cada ejecución.
  No ejecutar contra una base con datos reales.

Frontend:

```bash
cd Frontend
npm run lint    # 0 errores (estado verificado)
npm run build   # build exitoso
```

Límites verificados: no hay CI automatizado ni suite de pruebas frontend/E2E permanente en el repositorio.

## Limitaciones actuales

- No hay funcionalidad de pago (solo existe `paymentStatus` como campo).
- No hay recuperación/activación de contraseña ni envío por correo.
- No hay notificaciones ni recordatorios.
- No existe historia clínica global: el odontólogo ve "Atenciones anteriores" derivadas **solo de sus
  propias citas**.
- Sin odontograma, diagnósticos estructurados ni tratamientos.
- Las vistas administrativas de citas usan ventanas de ±30 días.
- La disponibilidad no anticipa conflictos del paciente (se validan al crear).
- La reprogramación no registra quién la realizó y las notas clínicas no tienen auditoría específica.
- La URL de la API del frontend requiere `VITE_API_URL` en el entorno (en producción debe definirse en
  el build).

No se presentan funcionalidades futuras como implementadas.