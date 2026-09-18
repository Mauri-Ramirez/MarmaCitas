# Modelo de Dominio - MarmaCitas

## Objetivo

Representar las entidades principales del sistema y las relaciones existentes entre ellas desde el punto de vista del negocio.

---

# Entidades del dominio

## User

Representa a todas las personas que interactúan con el sistema.

Dependiendo de su rol, un usuario puede ser:

- Administrador
- Recepcionista
- Odontólogo
- Paciente

### Atributos principales

- Nombre
- Correo electrónico
- Contraseña
- Rol
- Estado (activo/inactivo)

### Información profesional (solo para odontólogos)

- Tarjeta profesional
- Teléfono de contacto
- Especialidad

---

## Specialty

Representa las especialidades odontológicas ofrecidas por el consultorio.

Ejemplos:

- Ortodoncia
- Endodoncia
- Periodoncia
- Odontología General

---

## Service

Representa los tratamientos o procedimientos que ofrece el consultorio.

Cada servicio pertenece obligatoriamente a una especialidad.

### Atributos principales

- Nombre
- Descripción
- Duración
- Precio
- Especialidad
- Estado

Ejemplos:

- Valoración
- Limpieza Dental
- Blanqueamiento Dental

---

## Schedule

Representa el horario laboral asignado a un odontólogo.

Cada odontólogo puede tener únicamente un horario activo.

Los horarios representan la jornada laboral del consultorio de lunes a viernes.

### Atributos principales

- Odontólogo
- Hora de inicio
- Hora de finalización
- Estado

---

## Appointment

Representa una cita odontológica.

Relaciona:

- Paciente
- Odontólogo
- Servicio
- Fecha y hora
- Estado de la cita
- Estado del pago

La fecha y hora se representan mediante un único campo `dateTime`.

### Snapshot del servicio

La cita conserva una instantánea del servicio utilizado al momento de la reserva:

- ID del servicio
- Nombre
- Duración
- Precio

Esto permite conservar la información histórica de la cita aunque el servicio cambie posteriormente.

### Auditoría

La cita conserva información sobre:

- Usuario que creó la cita.
- Usuario que realizó el último cambio de estado.
- Fecha de creación.
- Fecha de última modificación.

---

## Payment

Representará la gestión de pagos asociados a las citas.

En la versión MVP, el pago será un módulo independiente y no condicionará la creación de una cita.

El estado del pago podrá consultarse desde la cita mediante `paymentStatus`.

La entidad Payment se implementará posteriormente.

---

## Clinical Record

Representará el historial clínico del paciente.

Se utilizará para almacenar información clínica generada durante la atención odontológica.

Esta entidad se implementará posteriormente.

---

# Relaciones del dominio

## User (Doctor) → Specialty

Relación:

Uno a Uno (1:1)

Todo odontólogo pertenece a una única especialidad.

---

## Specialty → Service

Relación:

Uno a Muchos (1:N)

Una especialidad puede ofrecer múltiples servicios.

Cada servicio pertenece únicamente a una especialidad.

---

## User (Doctor) → Schedule

Relación:

Uno a Uno (1:1) para el horario activo.

Un odontólogo puede tener únicamente un horario activo.

Un horario pertenece únicamente a un odontólogo.

Aunque puedan existir registros históricos desactivados debido al Soft Delete, solo puede existir un horario activo para cada odontólogo.

---

## User (Doctor) → Appointment

Relación:

Uno a Muchos (1:N)

Un odontólogo puede atender múltiples citas.

Cada cita pertenece a un único odontólogo.

---

## User (Patient) → Appointment

Relación:

Uno a Muchos (1:N)

Un paciente puede registrar múltiples citas.

Cada cita pertenece a un único paciente.

---

## Service → Appointment

Relación:

Uno a Muchos (1:N)

Un servicio puede estar asociado a múltiples citas.

Cada cita utiliza un único servicio.

La cita conserva además un snapshot de la información del servicio.

---

## Appointment → Payment

Relación:

Uno a Uno (1:1) conceptual

Una cita puede tener información de pago asociada.

En el MVP, el pago se gestiona de manera independiente y la cita mantiene `paymentStatus` para conocer su estado actual.

---

## Appointment → Clinical Record

Relación:

Uno a Uno (1:1) conceptual

Una cita completada puede generar o actualizar información en el historial clínico del paciente.

---

# Reglas importantes del dominio

## Especialidad del odontólogo y servicio

El servicio seleccionado para una cita debe pertenecer a la misma especialidad del odontólogo.

```text
Doctor.specialty
       ==
Service.specialty
```

---

## Disponibilidad

La disponibilidad de una cita depende de:

1. Horario activo del odontólogo.
2. Fecha y hora solicitada.
3. Duración del servicio.
4. Citas existentes del odontólogo.
5. Citas existentes del paciente.

El espacio completo correspondiente a la duración del servicio debe estar disponible.

---

# Modelo conceptual

```text
                           User
          ┌────────────────────────────────┐
          │ name                           │
          │ email                          │
          │ password                       │
          │ role                           │
          │ active                         │
          │--------------------------------│
          │ professionalLicense (Doctor)  │
          │ phone (Doctor)                │
          │ specialty (Doctor)            │
          └────────────────────────────────┘
                    │              │
             Patient│              │Doctor
                    │              │
                    │              ├───────────────┐
                    │              │               │
                    │              ▼               ▼
                    │         Specialty         Schedule
                    │              │
                    │              ▼
                    │           Service
                    │              │
                    │              │
                    └───────┐      │
                            ▼      ▼
                         Appointment
                         │    │    │
                         │    │    ├── dateTime
                         │    │    ├── status
                         │    │    ├── paymentStatus
                         │    │    └── serviceSnapshot
                         │    │
                         │    ├──────────────► Payment
                         │
                         └──────────────────► Clinical Record
```

---

# Estado actual del dominio

## Implementado

- User
- Autenticación
- Roles
- Specialty
- Service
- Doctor (ampliación de User)
- Schedule

## En desarrollo

- Appointment

## Pendiente

- Payment
- Clinical Record
- Notificaciones
- Integraciones externas
