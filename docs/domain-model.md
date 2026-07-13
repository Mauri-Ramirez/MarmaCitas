# Modelo de Dominio - MarmaCitas

## Objetivo

Definir las entidades principales del sistema, sus responsabilidades y sus relaciones antes de implementar los modelos en MongoDB.

---

# Principios de Diseño

- Cada entidad representa un concepto del negocio.
- Una entidad tiene una única responsabilidad.
- Se evita la duplicación innecesaria de información.
- Se prioriza la trazabilidad.
- El sistema debe ser escalable.

---

# Entidades

## User

Representa cualquier usuario del sistema.

Roles:

- patient
- doctor
- receptionist
- admin

Responsabilidades:

- Autenticación.
- Autorización.
- Acceso al sistema según su rol.

---

## Specialty

Representa una especialidad odontológica.

Ejemplos:

- Odontología General
- Ortodoncia
- Endodoncia
- Periodoncia
- Cirugía Oral
- Odontopediatría
- Estética Dental

Responsabilidades:

- Agrupar odontólogos.
- Agrupar servicios.
- Facilitar búsquedas.

---

## Service

Representa un servicio odontológico.

Ejemplos:

- Limpieza Dental
- Resina
- Valoración
- Instalación de brackets

Responsabilidades:

- Definir precio.
- Definir duración.
- Asociarse a una especialidad.
- Poder ser reservado.

---

## Schedule

Representa el horario laboral de un odontólogo.

Responsabilidades:

- Definir disponibilidad.
- Evitar conflictos de agenda.

---

## Appointment

Entidad central del sistema.

Responsabilidades:

- Relacionar paciente y odontólogo.
- Asociar un servicio.
- Registrar fecha y hora.
- Controlar el estado de la cita.
- Conservar la información histórica del servicio.

---

## ClinicalRecord

Representa el historial clínico generado durante una atención.

Responsabilidades:

- Diagnóstico.
- Tratamiento.
- Observaciones.

Solo existe cuando una cita ha sido atendida.

---

## Payment

Representa el pago asociado a una cita.

Responsabilidades:

- Registrar pagos.
- Registrar método de pago.
- Registrar estado del pago.

Es independiente de Appointment.

---

# Relaciones

User (Paciente)

1

↓

N

Appointment

---

User (Odontólogo)

1

↓

N

Appointment

---

Specialty

1

↓

N

Doctor

---

Specialty

1

↓

N

Service

---

Service

1

↓

N

Appointment

---

Appointment

1

↓

0..1

Payment

---

Appointment

1

↓

0..1

ClinicalRecord

---

Doctor

1

↓

N

Schedule

---

# Flujo de Reserva

Paciente

↓

Selecciona Servicio

↓

El sistema identifica la especialidad

↓

Obtiene los odontólogos de esa especialidad

↓

Consulta la disponibilidad

↓

Paciente selecciona horario

↓

Se crea la cita

↓

Estado: Confirmada

---

# Entidad Central

Appointment es el núcleo del sistema.

Todas las entidades colaboran con ella.

---

# Diagrama Conceptual

                   Specialty
                  /         \
                 /           \
          Doctor             Service
               \             /
                \           /
                Appointment
              /      |       \
             /       |        \
      Payment  ClinicalRecord
             \
           (Opcional)

Doctor
│
▼
Schedule

---

# Decisiones de Arquitectura

- Se utiliza una única entidad User para todos los tipos de usuario.
- Cada odontólogo pertenece a una única especialidad.
- Cada servicio pertenece a una única especialidad.
- El paciente nunca selecciona una especialidad manualmente; el sistema la deduce a partir del servicio.
- Appointment es la entidad central del sistema.
- Payment será un módulo independiente.
- ClinicalRecord solo existirá cuando una cita haya sido completada.
- Cada cita almacenará un snapshot del servicio para preservar el historial.
- Schedule será responsable de calcular la disponibilidad del odontólogo.

---

# Backlog Arquitectónico

Pendientes por definir:

- Modelo de horarios (Schedule).
- Vacaciones e incapacidades.
- Días festivos.
- Bloqueo manual de horarios.
- Agenda semanal del odontólogo.
- Horarios especiales.

---

# Futuras Entidades

- Notification
- Prescription
- Invoice
- Inventory
- LaboratoryOrder
- AuditLog
