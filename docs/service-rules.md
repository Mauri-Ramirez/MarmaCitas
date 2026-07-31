# Reglas de Negocio - Servicios Odontológicos

## Objetivo

Definir las reglas funcionales para la administración de los servicios odontológicos ofrecidos por el consultorio.

---

# ¿Qué es un servicio?

Un servicio representa un tratamiento o procedimiento odontológico que puede ser reservado mediante una cita.

Ejemplos:

- Valoración
- Limpieza Dental
- Resina
- Endodoncia
- Ortodoncia
- Blanqueamiento Dental

---

# Responsabilidades

Cada servicio debe definir:

- Nombre.
- Descripción.
- Duración.
- Precio.
- Especialidad a la que pertenece.
- Estado (Activo/Inactivo).

---

# Relación con Specialty

Todo servicio debe pertenecer obligatoriamente a una especialidad.

Ejemplo:

Odontología General

↓

- Valoración
- Limpieza Dental
- Resina

---

Ortodoncia

↓

- Instalación de brackets
- Control de ortodoncia
- Retiro de brackets

---

# Creación

Un servicio debe tener obligatoriamente:

- Nombre.
- Duración.
- Precio.
- Especialidad.

La descripción es opcional.

---

# Precio

El precio pertenece al servicio.

No pertenece al odontólogo.

Todos los odontólogos de una misma especialidad utilizan el mismo precio del servicio.

El precio se almacena como número entero (pesos colombianos).

Ejemplo:

80000

No:

$80.000

---

# Duración

La duración pertenece al servicio.

Se almacena en minutos.

Ejemplos:

30

45

60

90

---

# Especialidad

Todo servicio debe estar asociado a una única especialidad.

No puede existir un servicio sin especialidad.

---

# Estados

Activo

↓

Puede reservarse.

---

Inactivo

↓

No puede reservarse.

↓

Permanece disponible únicamente para conservar el historial.

---

# Soft Delete

Los servicios nunca serán eliminados físicamente.

Cuando un servicio deje de ofrecerse:

active = false

Esto garantiza conservar la integridad histórica de las citas.

---

# Modificaciones

El administrador podrá modificar:

- Nombre.
- Descripción.
- Precio.
- Duración.
- Especialidad.

Los cambios aplicarán únicamente para futuras reservas.

Las citas ya existentes conservarán un snapshot del servicio.

---

# Snapshot

Cuando una cita sea creada, almacenará una copia de:

- Nombre.
- Precio.
- Duración.

Esto garantiza que una modificación futura del servicio no altere el historial.

---

# Seguridad

Puede consultar servicios:

- Paciente
- Odontólogo
- Recepcionista
- Administrador

Puede administrar servicios:

- Administrador

---

# Validaciones

El nombre debe ser único.

La duración debe ser mayor que cero.

El precio debe ser mayor que cero.

Debe existir una especialidad asociada.

---

# Futuras mejoras

- Categorías de servicios.
- Imagen del servicio.
- Código interno.
- IVA configurable.
- Promociones.
- Precio temporal.
- Historial de precios.

# Dependencias

## Depende de

- Specialty

## Será utilizado por

- Appointment
- Payment
- Reportes
- Estadísticas

## Nombre del servicio

El nombre del servicio no necesita ser único en todo el sistema.

Sí debe ser único dentro de una misma especialidad.

Ejemplo válido:

Odontología General

- Valoración

Ortodoncia

- Valoración

Ejemplo NO válido:

Ortodoncia

- Valoración
- Valoración
