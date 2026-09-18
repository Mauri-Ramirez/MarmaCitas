# MARMA CITAS — ROADMAP MAESTRO

Documento de planificación por sprints. El código real es la fuente de verdad; este documento refleja
el estado verificado después de las fases de cierre (1, 2A, 2B-1, 2B-2A, 2B-2, 2C, 3A, 3B).

## 1. Estado actual del proyecto

- Backend: Node.js + Express 5 + Mongoose 9 + MongoDB + JWT + bcryptjs + Multer.
- Frontend: React + Vite + Tailwind CSS 4 + React Router + Axios.
- Autenticación JWT y RBAC con estado/rol vigente desde la BD.
- Roles: `patient`, `doctor`, `receptionist`, `admin`.
- Entidades: User, Specialty, Service, Schedule, Appointment.

No existen como entidades propias: historia clínica global, Payment, Notification.

## 2. Trabajo completado

- **Backend base, dominio, autenticación y RBAC** (User, Specialty, Service, Doctor, Schedule,
  soft delete, registro de paciente, login, JWT, `verifyToken` + `requireRole`). Completado.
- **Sistema de citas** (creación, disponibilidad, conflictos, cancelación, reprogramación, estados,
  snapshot, auditoría básica, zona horaria Colombia). Completado para el alcance actual.
- **Hardening de sesión** (usuario desactivado/rol obsoleto en JWT resuelto consultando la BD;
  manejo global de 401 en el frontend). Resuelto.
- **Concurrencia** (transacciones + locks de citas, control optimista). Completado.
- **Perfiles y agendas** de paciente, odontólogo, recepción y administración (dashboards reales,
  agenda maestro-detalle, catálogo con tabs, booking compartido, gestión de usuarios admin). Completado.
- **Reglas de citas** (24 h solo paciente, odontólogo no cancela, reprogramación con original futura
  y 24 h para paciente, no_show desde la hora exacta, notas clínicas solo en `in_progress`). Completado.
- **Integridad administrativa** (bloqueo de desactivación de odontólogo con citas pendientes; bloqueo
  de modificación de horario que deja citas fuera de cobertura). Completado.
- **UX de cancelación del paciente** (oculta el botón si faltan 24 h y muestra mensaje). Completado.
- **Adjuntos clínicos protegidos** y notas clínicas separadas del motivo de consulta. Completado.

## 3. Pendientes

- **Sprint 3.7 — Historia clínica:** no implementada. No existen modelos ni endpoints clínicos
  globales. El odontólogo solo ve atenciones previas derivadas de sus propias citas.
- **Sprint 3.8 — Pagos:** solo `paymentStatus` (pending/paid); sin entidad ni endpoint de pago.
- **Sprint 3.9 — Notificaciones y recordatorios:** no implementados.
- **Sprint 3.10 — Seguridad y robustez (parcial):** resuelto: validación de sesión por BD, 401 global,
  zona horaria, concurrencia. Pendiente: CORS restringido, rate limiting, middleware global de
  errores, validación centralizada de entrada, auditoría de reprogramación/notas, recuperación de
  contraseña.
- **Sprint 3.12 — QA final:** no ejecutado como fase formal.
- **Sprint 3.13 — Documentación final:** en curso (los documentos de `docs/` se actualizan a la
  realidad del código).

## 4. Limitaciones conocidas actuales

- Sin pagos funcionales, sin recuperación/activación de contraseña, sin notificaciones.
- Sin historia clínica global.
- Vistas administrativas de citas en ventanas de ±30 días.
- La disponibilidad no anticipa conflictos del paciente hasta la creación.
- Sin auditoría de reprogramación ni de edición de notas.
- CORS abierto y sin rate limiting.
- Sin CI ni suite frontend/E2E permanente.

## 5. Reglas de trabajo del proyecto

- Trabajar sobre la rama `dev`; mantener `main` como rama estable.
- No modificar funcionalidades terminadas sin motivo.
- Antes de implementar algo nuevo, verificar si el backend ya lo soporta.
- Las reglas de negocio permanecen en backend; el frontend no es la autoridad.
- Cada bloque estable debe probarse antes de integrarse.
- La documentación debe reflejar el estado real, no funcionalidades futuras como si existieran.