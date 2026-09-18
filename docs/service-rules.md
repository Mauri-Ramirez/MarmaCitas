# Reglas de Negocio — Servicios Odontológicos

Comportamiento real verificado en el código actual.

## ¿Qué es un servicio?

Un servicio representa un tratamiento o procedimiento odontológico que puede reservarse mediante una
cita. Debe pertenecer obligatoriamente a una especialidad.

## Atributos

- Nombre (obligatorio, máx. 100 caracteres).
- Descripción (opcional, máx. 300).
- Duración (minutos, obligatoria, mayor que cero).
- Precio (obligatorio, mayor que cero).
- Especialidad (obligatoria).
- Estado (Activo/Inactivo) con soft delete.

## Relación con Specialty

Todo servicio pertenece a una única especialidad (ObjectId con populate). La especialidad debe existir
y estar activa para crear o actualizar el servicio.

## Unicidad del nombre

- El nombre **no** es único a nivel de todo el sistema: puede repetirse entre especialidades distintas
  (p. ej., "Valoración" en Odontología General y en Ortodoncia).
- **No puede repetirse dentro de la misma especialidad.** Esta unicidad se valida en el **controller**
  en creación y actualización.
- **No existe** un índice único compuesto `(name, specialty)` en la base de datos; en condiciones de
  concurrencia dos creaciones podrían duplicarlo. Es una limitación conocida.

## Estados

- Activo → puede reservarse.
- Inactivo → no puede reservarse; se conserva para el historial.

## Snapshot en citas

Al crear una cita se almacena una copia del servicio (`serviceSnapshot`: id, nombre, duración y
precio). Las modificaciones posteriores del servicio no alteran las citas existentes.

## Modificaciones

- Solo el administrador modifica servicios (nombre, descripción, precio, duración, especialidad).
- Los cambios aplican a futuras reservas; las citas existentes conservan su snapshot.

## Seguridad

- Consulta: cualquier usuario autenticado.
- Administración (crear/actualizar/desactivar): solo administrador.

## Notas sobre duración y precio

- La duración se almacena en minutos; el código solo exige `>= 1`, no impone múltiplos de 15.
- El precio se almacena como número entero (pesos colombianos).