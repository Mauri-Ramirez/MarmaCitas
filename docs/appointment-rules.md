# Reglas de Negocio — Gestión de Citas

Comportamiento real verificado en el código actual (backend y frontend).

## Actores

- Paciente
- Recepcionista
- Odontólogo
- Administrador

## Flujo de reserva

1. El cliente obtiene servicios y odontólogos activos.
2. La interfaz muestra **especialidad → servicio → fecha → hora → odontólogo**: se consulta la
   disponibilidad de los odontólogos de la especialidad del servicio (unión de slots) y el odontólogo
   se elige después de la hora.
3. El backend valida al crear la cita: fecha futura, lunes a viernes, jornada efectiva (horario del
   doctor ∩ jornada clínica 08–12/14–17), duración completa del servicio, actores activos, servicio
   activo de la misma especialidad y sin solapamientos del doctor ni del paciente.
4. La cita queda en estado `confirmed` y pago `pending`. Se conserva snapshot del servicio y el
   `reason` (motivo de consulta) escrito por el paciente (o por recepción/admin).

## Disponibilidad

- Cadencia fija de 15 minutos; la duración del servicio solo define la longitud y el recorte final.
- Días hábiles (lunes a viernes) dentro de la jornada efectiva; se omiten horas ya pasadas.
- Se descuentan las citas `confirmed` e `in_progress` del odontólogo.
- La disponibilidad **no** anticipa los conflictos del paciente (se validan al crear la cita).

## Estados

- `confirmed` — Confirmada
- `in_progress` — En atención
- `completed` — Completada
- `cancelled` — Cancelada
- `no_show` — No asistió

Transiciones:

- `confirmed` → `in_progress` (admite hasta 15 minutos de anticipación), `cancelled`, `no_show`.
- `in_progress` → `completed`.
- `no_show` solo se puede marcar desde la hora exacta de la cita (sin tolerancia).
- Estados terminales (`completed`, `cancelled`, `no_show`) no cambian.

## Cancelación

- **Paciente:** solo sus propias citas y con un mínimo de **24 horas** de anticipación.
- **Recepción y admin:** pueden cancelar citas (incluidas las que faltan menos de 24 horas).
- **Odontólogo:** **no puede cancelar** citas; el endpoint de cambio de estado lo impide
  (`PATCH /appointments/:id/status` no admite `confirmed → cancelled` para el rol doctor).
- Una cita ya completada, cancelada, marcada como no asistió o en curso no puede cancelarse por el
  endpoint de cancelación.

## Reprogramación

- Pueden reprogramar: paciente (propias), recepción y admin. El odontólogo no.
- Solo citas `confirmed`.
- La **cita original debe ser futura** (una cita pasada no se reprograma).
- La nueva fecha debe ser futura y cumplir jornada, horario, duración, servicio y conflictos.
- Para el **paciente**, la cita original debe tener al menos **24 horas** de anticipación (evita
  eludir la regla de cancelación reprogramando y cancelando). Recepción y admin no tienen esa
  restricción de anticipación.
- No se registra quién realizó la reprogramación.

## No_show

- Lo pueden marcar el odontólogo (solo sus propias citas), recepción y admin.
- Solo desde la **hora exacta** de la cita; no se puede marcar antes.
- La tolerancia de 15 minutos existe únicamente para iniciar atención (`in_progress`).

## Notas clínicas

- Endpoint: `PATCH /appointments/:id/notes` (solo rol doctor y solo la cita del doctor).
- Solo se pueden crear/modificar mientras la cita está `in_progress`. Al pasar a `completed`, o en
  `confirmed`/`cancelled`/`no_show`, quedan cerradas (rechazo 400).
- Máximo 2000 caracteres. No hay auditoría específica de autor/fecha de la nota.
- El paciente no recibe `clinicalNotes` desde la API.

## Motivo de consulta (`reason`)

- Se almacena separado de la nota clínica. Lo escribe el paciente al agendar (o recepción/admin).
- Es visible para recepción, admin y odontólogo; el paciente lo recibe en sus citas.

## Adjuntos clínicos

- Solo el doctor de la cita y solo mientras está `in_progress`.
- Formatos PDF, JPG, JPEG y PNG; máx. 5 archivos por cita; máx. 10 MB por archivo.
- No hay servido público: se descargan por endpoint autenticado.

## Pago

- Existe solo `paymentStatus` (`pending`/`paid`) como campo de la cita.
- **No** existe funcionalidad para registrar o confirmar pagos (sin endpoint ni interfaz).

## Especialidad

- El servicio seleccionado debe pertenecer a la misma especialidad del odontólogo.

## Auditoría

- Cada cita conserva: fecha de creación, fecha de última modificación, usuario que la creó
  (`createdBy`) y usuario del último cambio de estado (`lastStatusChangedBy`).
- No se registra quién reprograma ni quién edita notas.

## Historial

- Las citas no se eliminan físicamente (estados terminales conservan la trazabilidad).
- El odontólogo ve "Atenciones anteriores" derivadas **solo de sus propias citas**; no es una historia
  clínica global del paciente.