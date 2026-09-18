# Arquitectura — MarmaCitas

## Stack

- **Backend:** Node.js (ESM), Express 5, Mongoose 9 sobre MongoDB (Atlas). JWT para autenticación,
  bcryptjs para contraseñas, Multer para adjuntos.
- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Axios.
- **Zona horaria:** America/Bogota (Colombia, sin DST, offset -05:00).

## Organización del backend

```
config/
  db.js                -> conexión MongoDB
  clinicSchedule.js    -> jornada clínica fija (08-12 y 14-17) y helpers de tramos
models/
  User.js, Specialty.js, Service.js, Schedule.js, Appointment.js
controllers/
  authController, userController, specialtyController, serviceController,
  doctorController, scheduleController, appointmentController
routes/
  authRoutes, userRoutes, specialtyRoutes, serviceRoutes, doctorRoutes,
  scheduleRoutes, appointmentRoutes
middlewares/
  authMiddleware   -> verifyToken (JWT + estado/rol vigente en BD)
  roleMiddleware   -> requireRole
  uploadMiddleware -> Multer para adjuntos clínicos
scripts/
  seedDemo.js, migrateClinicBreak.js, migrateAppointmentNotes.js
tests/
  suites node:test (14)
```

No existe capa de servicios/repositorios/use-cases: los controllers concentran acceso a datos,
validaciones y reglas de negocio. Es una limitación conocida, no un defecto a corregir en esta fase.

## Autenticación y RBAC

- `verifyToken` valida el JWT y consulta el **usuario real en BD** en cada request: si el usuario no
  existe o está inactivo → 401; token inválido/malformado → 403. El rol vigente se toma de la BD, no
  del token, de modo que desactivar o cambiar de rol a un usuario pierde efecto de inmediato.
- `requireRole(roles...)` protege las rutas por rol.
- El frontend replica permisos solo como capa UX (`PrivateRoute`); el backend es la autoridad.

## Citas: concurrencia y control optimista

- **Creación y reprogramación** se ejecutan dentro de una transacción MongoDB que serializa mediante
  `User.appointmentLockVersion` (incrementos en los documentos del doctor y del paciente, en orden
  determinista por `_id`). El perdedor de una carrera recibe 409.
- **Cambios de estado, cancelación y notas** usan `optimisticConcurrency` (`__v`): dos escrituras
  concurrentes no se aplican silenciosamente (la segunda recibe `VersionError` → 409).
- Los índices de consulta de citas: `{doctor, status, dateTime}` y `{patient, status, dateTime}`.

## Zona horaria y jornada clínica

- La disponibilidad y la validación de horario usan `America/Bogota` (`getBogotaParts`).
- Jornada clínica fija: `08:00–12:00` y `14:00–17:00` (`config/clinicSchedule.js`).
- El horario efectivo de un odontólogo es la **intersección** de su horario (inicio/fin + pausa
  opcional) con la jornada clínica. La validación de citas y la disponibilidad usan esta intersección.
- Cadencia de slots de 15 minutos, independiente de la duración del servicio.

## Horarios

- Un solo horario **activo** por odontólogo, garantizado con un índice único parcial
  `{ doctor: 1 }` con `partialFilterExpression: { active: true }` (permite históricos desactivados).
- Nota operativa: si existe un índice único global antiguo `{ doctor: 1 }`, debe eliminarse
  manualmente (dropIndex) antes de que Mongoose cree el parcial.

## Adjuntos clínicos

- Almacenamiento local protegido en `Backend/uploads/appointments` (ruta anclada al módulo,
  sobreescribible con la variable `UPLOADS_DIR`).
- Sin `express.static`: los archivos se sirven únicamente mediante el endpoint autenticado
  `GET /api/appointments/:id/attachments/:attachmentId` (solo el doctor de la cita).
- `uploads/` y `uploads-test/` están ignorados en Git.

## Scripts de migración

- `seed:demo` — datos mínimos de demostración (idempotente).
- `migrate:clinic` — alineó la pausa 12–14 en horarios activos que la abarcaban.
- `migrate:notes` — migró el campo legacy `notes` a `reason` (conserva `notes` crudo en MongoDB;
  el campo ya no existe en el schema).

## Límites arquitectónicos conocidos

- `appointmentController.js` concentra mucha lógica (disponibilidad, creación, reprogramación,
  cancelación, estados, notas, adjuntos); no se propone refactor en esta fase.
- Sin capa de servicios ni middleware global de errores; varios controllers devuelven `error.message`.
- CORS abierto; sin rate limiting ni headers de seguridad adicionales.
- La validación de conflictos carga todas las citas activas del doctor/paciente (sin ventana
  temporal) y los locks serializan por actor.
- Los tests de backend son la única automatización; no hay CI ni suite frontend/E2E permanente.