# Doctor - Reglas de Negocio

## Objetivo

Administrar los odontólogos del consultorio y su información profesional.

---

## Reglas de negocio

### RN-001

Todo odontólogo es un usuario del sistema.

---

### RN-002

Debe tener el rol `doctor`.

---

### RN-003

Debe estar asociado obligatoriamente a una especialidad activa.

---

### RN-004

Solo puede pertenecer a una especialidad.

---

### RN-005

La tarjeta profesional es obligatoria y debe ser única.

---

### RN-006

Solo el administrador puede crear, actualizar, activar o desactivar odontólogos.

---

### RN-007

Los odontólogos desactivados no podrán iniciar sesión.

---

### RN-008

La información personal (nombre, correo y contraseña) se administra desde el modelo User.

La información profesional (especialidad, tarjeta profesional y teléfono) complementa el perfil del odontólogo.
