# Modelo de Dominio — MarmaCitas

Entidades reales del sistema y sus relaciones (verificadas en el código actual).

## Entidades

### User

Usuario compartido para los cuatro roles (`patient`, `doctor`, `receptionist`, `admin`).

Atributos principales:

- `name`
- `email` (único)
- `password` (bcrypt)
- `role`
- `active`
- `timestamps`

Datos médicos del paciente (en `User`):

- `allergies` (máx. 300)
- `medicalNotes` (máx. 1000)
- Editables solo por el paciente vía `PUT /users/me`; visibles para recepción/admin y para el
  odontólogo en su agenda.

Información profesional (solo odontólogos):

- `professionalLicense` (única)
- `phone`
- `specialty` (ref → Specialty)

Campo técnico:

- `appointmentLockVersion` (contador para serializar transacciones de citas; `select: false`).

### Specialty

- `name` (único)
- `description`
- `active` (soft delete)
- `timestamps`

### Service

- `name` (máx. 100), `description` (máx. 300)
- `duration` (minutos, >= 1)
- `price` (>= 1)
- `specialty` (ref → Specialty, obligatoria)
- `active` (soft delete)
- `timestamps`

### Schedule

- `doctor` (ref → User)
- `startTime`, `endTime` (HH:mm)
- `breakStart`, `breakEnd` (opcionales)
- `active` (soft delete)
- Un solo horario **activo** por odontólogo (índice único parcial).
- `timestamps`

### Appointment

- `patient`, `doctor` (ref → User), `service` (ref → Service)
- `dateTime`
- `status`: `confirmed | in_progress | completed | cancelled | no_show`
- `paymentStatus`: `pending | paid` (sin funcionalidad de pago)
- `serviceSnapshot`: `{ serviceId, name, duration, price }`
- `reason` (motivo de consulta)
- `clinicalNotes` (nota de atención del odontólogo; máx. 2000 en el controller)
- `attachments`: `[{ filename, storedName, mimeType, size, uploadedBy, uploadedAt }]`
- Auditoría: `createdBy`, `lastStatusChangedBy`, `timestamps`
- `optimisticConcurrency` (control optimista por `__v`)

## Relaciones

- `User(doctor)` 1—1 `Specialty` (una especialidad por odontólogo).
- `Specialty` 1—N `Service`.
- `User(doctor)` 1—1 `Schedule` (un horario activo; históricos desactivados pueden coexistir).
- `User(doctor)` 1—N `Appointment`.
- `User(patient)` 1—N `Appointment`.
- `Service` 1—N `Appointment` (con snapshot).
- `Appointment` → `Payment`: conceptual (solo `paymentStatus`).
- `Appointment` → historia clínica: no implementada.

## Disponibilidad

La disponibilidad de una cita depende de: horario activo del odontólogo, fecha/hora solicitada,
duración del servicio y citas existentes del odontólogo. El espacio completo de la duración debe estar
libre. La jornada efectiva es la intersección del horario del odontólogo con la jornada clínica
(08–12 / 14–17). Los conflictos del paciente se validan al crear la cita.

## Estado de implementación

Implementado: User, autenticación, roles, Specialty, Service, Doctor (sobre User), Schedule,
Appointment (incluidos reason, clinicalNotes, attachments y control de concurrencia).

No implementado (futuro): Payment funcional, Clinical Record global, odontograma, notificaciones.