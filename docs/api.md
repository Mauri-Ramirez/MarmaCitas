# API — MarmaCitas

Especificación concisa de los endpoints existentes. La autorización se aplica con `verifyToken`
(JWT) y `requireRole(roles...)`. Un token inválido/malformado responde 403; un usuario inexistente o
inactivo responde 401 (el backend consulta el estado/rol vigente en BD en cada request).

Prefijo base: `/api`.

## Autenticación (`/auth`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | público | Registra un paciente (name, email, password). No acepta rol enviado por el cliente. |
| POST | `/auth/login` | público | Login (email, password) → `token` (JWT 1 día) y `user`. Usuario inactivo → 403. |

## Usuarios (`/users`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/users/me` | cualquier autenticado | Perfil propio. |
| PUT | `/users/me` | cualquier autenticado | Actualiza `name`; solo paciente puede enviar `phone`, `allergies`, `medicalNotes`. |
| GET | `/users` | admin | Lista usuarios con filtros `role`, `search`, `page`, `limit`. |
| PATCH | `/users/:id/active` | admin | Activa/desactiva un usuario (`active: boolean`). Un admin no puede cambiar su propio estado. Desactivar un doctor con citas pendientes/futuras → 409. |
| GET | `/users/patients` | receptionist, admin | Lista pacientes (`search` por nombre, correo o teléfono, `page`, `limit`). |
| GET | `/users/patients/:id` | receptionist, admin | Detalle de paciente. |
| PUT | `/users/patients/:id` | receptionist, admin | Actualiza `name`, `phone`, `allergies`, `medicalNotes` de un paciente. |
| POST | `/users/patients` | receptionist, admin | Crea paciente (name, email; contraseña aleatoria interna no entregada). |
| GET | `/users/admin` | admin | Echo de autorización (sin uso funcional). |

## Especialidades (`/specialties`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/specialties` | cualquier autenticado | Lista especialidades activas. |
| GET | `/specialties/:id` | cualquier autenticado | Detalle. |
| POST | `/specialties` | admin | Crea especialidad (name único). |
| PUT | `/specialties/:id` | admin | Actualiza especialidad. |
| DELETE | `/specialties/:id` | admin | Soft delete (`active=false`). |

## Servicios (`/services`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/services` | cualquier autenticado | Lista servicios activos (especialidad poblada). |
| GET | `/services/:id` | cualquier autenticado | Detalle. |
| POST | `/services` | admin | Crea servicio (name, description?, duration, price, specialty). Unicidad por especialidad validada en el controller (sin índice único compuesto en BD). |
| PUT | `/services/:id` | admin | Actualiza servicio. |
| DELETE | `/services/:id` | admin | Soft delete (`active=false`). |

## Odontólogos (`/doctors`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/doctors` | cualquier autenticado | Lista odontólogos activos (filtro opcional `specialty`). |
| GET | `/doctors/:id` | admin | Detalle. |
| POST | `/doctors` | admin | Crea odontólogo (name, email, password, professionalLicense, phone, specialty). |
| PUT | `/doctors/:id` | admin | Actualiza name, professionalLicense, phone, specialty (especialidad debe estar activa). |
| DELETE | `/doctors/:id` | admin | Desactiva odontólogo. **409** si tiene citas `in_progress` o `confirmed` futuras. |

## Horarios (`/schedules`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/schedules` | admin | Lista horarios activos. |
| GET | `/schedules/my` | doctor | Horario activo propio. |
| GET | `/schedules/doctor/:doctorId` | receptionist, admin | Horario activo de un odontólogo. |
| GET | `/schedules/:id` | admin | Detalle. |
| POST | `/schedules` | admin | Crea horario (`startTime`, `endTime`, `breakStart?`, `breakEnd?`). Debe caber en la jornada clínica 08–12/14–17. |
| PUT | `/schedules/:id` | admin | Actualiza horario. **409** si el nuevo horario deja fuera de cobertura una cita futura que sí estaba cubierta. |
| DELETE | `/schedules/:id` | admin | Soft delete (`active=false`). |

Horarios: formato `HH:mm`, un solo horario activo por odontólogo (índice único parcial).

## Citas (`/appointments`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/appointments` | receptionist, admin | Lista con filtros `date`, `dateFrom/dateTo`, `doctorId`, `patientId`, `serviceId`, `status`, `paymentStatus`, `search`, `page`, `limit`. |
| GET | `/appointments/my` | patient | Citas propias (sin `clinicalNotes` ni `attachments`). |
| GET | `/appointments/doctor` | doctor | Citas asignadas al odontólogo (paciente con teléfono, alergias, observaciones). |
| GET | `/appointments/availability` | patient, receptionist, admin | Slots disponibles (`doctorId`, `serviceId`, `date`); cadencia 15 min. |
| GET | `/appointments/:id` | receptionist, admin | Detalle completo de una cita. |
| POST | `/appointments` | patient, receptionist, admin | Crea cita. Recepción/admin envían `patientId`; el paciente se usa a sí mismo. `reason` es el motivo de consulta. |
| PUT | `/appointments/:id/reschedule` | patient, receptionist, admin | Reprograma. Solo `confirmed`; la original debe ser futura; el paciente necesita ≥24 h en la original. |
| DELETE | `/appointments/:id` | patient, receptionist, admin | Cancela. **24 h mínimo solo para el paciente**; recepción/admin pueden cancelar con menos. |
| PATCH | `/appointments/:id/status` | doctor, receptionist, admin | Cambia estado (ver transiciones). El odontólogo no puede cancelar. |
| PATCH | `/appointments/:id/notes` | doctor | Nota clínica: solo el doctor de la cita y solo con la cita `in_progress`; máx. 2000 caracteres. |
| POST | `/appointments/:id/attachments` | doctor | Sube archivos clínicos (solo `in_progress`, máx. 5, máx. 10 MB, PDF/JPG/JPEG/PNG). |
| GET | `/appointments/:id/attachments/:attachmentId` | doctor | Descarga protegida e inline de un adjunto (solo el doctor de la cita). |

### Transiciones de estado

- `confirmed` → `in_progress` (tolerancia: hasta 15 min antes de la hora), `cancelled`, `no_show`.
- `in_progress` → `completed`.
- `no_show` solo desde la hora exacta de la cita (sin tolerancia).
- Estados terminales (`completed`, `cancelled`, `no_show`) no cambian.
- El odontólogo no puede pasar `confirmed → cancelled` (regla de cancelación de citas).

### Códigos relevantes

- 400 validación de reglas (fechas, horario, estados, notas, adjuntos).
- 403 rol no permitido o nota/adjunto de otra cita.
- 404 recurso no encontrado.
- 409 conflicto concurrente, horario ocupado, integridad administrativa (doctor con citas, horario
  que deja citas fuera de cobertura).

### Protección de adjuntos

- No existe servido estático de `uploads/`; solo el endpoint autenticado los entrega.
- Los adjuntos se guardan en `Backend/uploads/appointments` (configurable con `UPLOADS_DIR`).

No se documentan endpoints inexistentes (p. ej., no existe endpoint de pago ni de recuperación de
contraseña).