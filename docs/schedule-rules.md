# Reglas de Negocio - Gestión de Horarios

## Proyecto

MarmaCitas

---

# Objetivo

Permitir que el administrador gestione el horario laboral de cada odontólogo.

Los horarios serán utilizados posteriormente por el módulo de citas para determinar la disponibilidad de atención.

---

## RN-SH-001

Solo los usuarios con rol **Administrador** pueden crear, modificar o desactivar horarios.

---

## RN-SH-002

Un horario solo puede asignarse a usuarios cuyo rol sea **doctor**.

---

## RN-SH-003

El odontólogo debe encontrarse activo para poder asignarle un horario.

---

## RN-SH-004

Cada odontólogo puede tener únicamente un horario activo.

Si el odontólogo ya posee un horario activo, el sistema no permitirá registrar otro.

---

## RN-SH-005

La hora de inicio debe ser menor que la hora de finalización.

Ejemplo válido:

08:00 → 17:00

Ejemplo inválido:

17:00 → 08:00

---

## RN-SH-006

El consultorio presta atención de lunes a viernes.

Por esta razón, los horarios almacenados representan la jornada laboral del odontólogo dentro de esos días y no es necesario registrar los días de la semana en cada documento.

---

## RN-SH-007

Los horarios utilizan eliminación lógica (Soft Delete).

Cuando un horario sea eliminado, únicamente cambiará su estado a:

active = false

El documento permanecerá almacenado en la base de datos.