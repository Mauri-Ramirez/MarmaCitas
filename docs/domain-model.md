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

Ejemplos:

- Valoración
- Limpieza Dental
- Blanqueamiento Dental

---

## Appointment (Futuro)

Representará una cita odontológica.

Relacionará:

- Paciente
- Odontólogo
- Servicio
- Fecha
- Hora
- Estado

---

## Schedule (Futuro)

Representará la disponibilidad de cada odontólogo.

Permitirá definir:

- Días laborales
- Horarios
- Bloques disponibles

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

## User (Doctor) → Schedule (Futuro)

Relación:

Uno a Muchos (1:N)

Un odontólogo podrá tener múltiples horarios registrados.

---

## User (Doctor) → Appointment (Futuro)

Relación:

Uno a Muchos (1:N)

Un odontólogo podrá atender múltiples citas.

---

## User (Patient) → Appointment (Futuro)

Relación:

Uno a Muchos (1:N)

Un paciente podrá registrar múltiples citas.

---

## Service → Appointment (Futuro)

Relación:

Uno a Muchos (1:N)

Un servicio podrá estar asociado a múltiples citas.

---

# Modelo conceptual

```text
                        User
        ┌─────────────────────────────────┐
        │ name                            │
        │ email                           │
        │ password                        │
        │ role                            │
        │ active                          │
        │---------------------------------│
        │ professionalLicense (Doctor)    │
        │ phone (Doctor)                  │
        │ specialty (Doctor)              │
        └─────────────────────────────────┘
                      │
          ┌───────────┴────────────┐
          │                        │
     (Paciente)              (Odontólogo)
          │                        │
          │                        │
          │                  pertenece a
          │                        │
          │                        ▼
          │                 ┌──────────────┐
          │                 │  Specialty   │
          │                 └──────────────┘
          │                        │
          │                  tiene muchos
          │                        │
          ▼                        ▼
                 ┌───────────────────────┐
                 │       Service         │
                 └───────────────────────┘
                          │
                          │
                    (Futuro)
                          │
                          ▼
                 ┌───────────────────────┐
                 │     Appointment       │
                 └───────────────────────┘
```

---

# Estado actual del dominio

## Implementado

- User
- Specialty
- Service
- Autenticación
- Roles

## Pendiente

- Doctor (ampliación del modelo User)
- Schedule
- Appointment
- Payment
- Clinical Record
