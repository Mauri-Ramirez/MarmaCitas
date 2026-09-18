# MarmaCitas — Backend

Guía breve del backend real (Node.js + Express 5 + Mongoose 9).

## Stack

- Node.js (ESM), Express 5, Mongoose 9 sobre MongoDB (Atlas).
- JWT (1 día), bcryptjs, Multer (adjuntos), dotenv, CORS.

## Estructura principal

```
config/      -> db (conexión MongoDB) y clinicSchedule (jornada clínica fija)
controllers/ -> lógica de negocio por recurso
models/      -> User, Specialty, Service, Schedule, Appointment
routes/      -> auth, users, specialties, services, doctors, schedules, appointments
middlewares/ -> verifyToken (JWT + rol/estado desde BD), requireRole, upload (adjuntos)
scripts/     -> seedDemo y migraciones
tests/       -> suites node:test
server.js    -> punto de entrada (puerto 5000 por defecto)
```

## Grupos de API

Prefijo base: `/api`.

- `/auth` — registro público de pacientes y login (JWT).
- `/users` — perfil propio, gestión de pacientes (recepción/admin) y activación de usuarios (admin).
- `/specialties`, `/services`, `/doctors`, `/schedules` — catálogo, odontólogos y horarios (lectura
  autenticada; escritura solo admin).
- `/appointments` — citas, disponibilidad, estados, notas clínicas y adjuntos protegidos.

Reglas críticas: jornada clínica fija `08:00–12:00` y `14:00–17:00` (America/Bogota), conflictos de
doctor/paciente, cancelación con 24 h solo para el paciente (el odontólogo no cancela),
reprogramación solo de citas `confirmed` futuras, `no_show` desde la hora exacta, notas clínicas solo
del doctor dueño y con la cita `in_progress`.

Detalles completos en `docs/api.md`.

## Configuración

Copiar `.env.example` a `.env`:

- `MONGO_URI` — cadena de conexión a MongoDB (base `marmacitas`).
- `JWT_SECRET` — secreto de firma de los tokens.
- `PORT` — opcional (5000 por defecto).
- `UPLOADS_DIR` — opcional; directorio de adjuntos (`Backend/uploads/appointments`).

`uploads/` y `uploads-test/` están ignorados en Git; los adjuntos se sirven solo por endpoint
autenticado.

## Ejecución

```bash
npm install
npm run dev        # nodemon server.js
```

## Scripts

```bash
npm run seed:demo       # datos mínimos de demostración (idempotente)
npm run migrate:clinic  # alineación histórica de la pausa 12-14 en horarios
npm run migrate:notes   # migró el campo legacy `notes` a `reason`
npm test                # 148/148 tests en 14 suites
```

## Pruebas

- Motor: `node:test`, ejecución serializada (`--test-concurrency=1`).
- Base: **`marmacitas_test`** (destructiva: borra colecciones en cada ejecución; no usar con datos
  reales).
- Adjuntos: directorio aislado **`uploads-test`** (nunca toca `uploads/` reales).
