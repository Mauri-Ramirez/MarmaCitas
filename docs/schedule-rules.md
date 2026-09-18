# Reglas de Negocio — Gestión de Horarios

Comportamiento real verificado en el código actual.

## Formato

- `startTime`, `endTime`, `breakStart`, `breakEnd` en formato `HH:mm`.
- La hora de inicio debe ser menor que la hora de finalización.

## Jornada de la clínica

- Jornada fija del consultorio (lunes a viernes): `08:00–12:00` y `14:00–17:00`
  (`Backend/config/clinicSchedule.js`).
- Un horario de odontólogo (incluida su pausa) debe quedar dentro de la jornada clínica; si no, se
  rechaza con el mensaje "El horario debe estar dentro de la jornada de la clínica (08:00-12:00 y
  14:00-17:00)."

## Pausa opcional

- `breakStart`/`breakEnd` son opcionales y deben enviarse juntos.
- Si existen, la jornada del odontólogo se divide en dos tramos: inicio → pausa y pausa → fin.
- Ejemplos válidos: solo mañana (08:00–12:00), solo tarde (14:00–17:00) o dos tramos
  (p. ej., 10:00–15:00 con pausa 12:00–14:00).

## Horario efectivo

- La disponibilidad y la validación de citas usan la **intersección** entre los tramos del odontólogo
  (horario propio + pausa) y la jornada clínica.
- Una cita debe caber completa (inicio + duración del servicio) dentro de un tramo efectivo.

## Un solo horario activo por odontólogo

- Se garantiza con un índice único parcial `{ doctor: 1 }` con `partialFilterExpression:
  { active: true }`.
- Los horarios históricos desactivados (soft delete) pueden coexistir.
- Nota operativa: si existe un índice único global antiguo `{ doctor: 1 }`, debe eliminarse
  manualmente (dropIndex) para que Mongoose cree el parcial.

## Creación y modificación

- Solo el administrador crea, modifica o desactiva horarios.
- `POST /schedules`: crea el horario activo (debe caber en la jornada clínica).
- `PUT /schedules/:id`: actualiza el horario. Además de la validación de jornada, **se bloquea (409)
  si el nuevo horario deja fuera de cobertura alguna cita futura `confirmed` del odontólogo que sí
  estaba cubierta por el horario actual** (regla comparativa). Las citas legacy que ya estaban fuera
  de cobertura no bloquean la modificación.
- `DELETE /schedules/:id`: soft delete (`active = false`). No valida citas futuras en esta versión.

## Modificación de horario y citas futuras

Cobertura de una cita futura:

- se calcula con la fecha/hora en `America/Bogota`;
- el intervalo completo (inicio + duración del snapshot del servicio) debe quedar dentro de un tramo
  efectivo del **nuevo** horario;
- solo afecta citas `confirmed` futuras.

Ejemplos:

- Reducir `endTime` dejando una cita fuera → 409.
- Ampliar `endTime` sin dejar citas fuera → permitido (siempre que cumpla la jornada clínica; ampliar
  más allá de las 17:00 es rechazado por la clínica).
- Adelantar `startTime` sin afectar citas → permitido.
- Una pausa nueva que invade una cita → 409.
- Quitar una pausa sin dejar citas fuera → permitido.