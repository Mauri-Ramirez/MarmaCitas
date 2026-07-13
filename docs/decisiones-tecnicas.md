# Decisiones Técnicas

## Sprint 1 - Seguridad

### Base de datos

Se decidió utilizar MongoDB Atlas.

**Motivos**

- Fácil integración con MERN.
- Escalable.
- Flexible para el historial clínico.
- Servicio gratuito para desarrollo.

---

### Autenticación

Se decidió utilizar JWT.

**Motivos**

- Stateless.
- Muy utilizado en APIs REST.
- Fácil integración con React.
- Compatible con futuras aplicaciones móviles.

---

### Contraseñas

Se utiliza bcrypt.

**Motivos**

- Nunca almacenar contraseñas en texto plano.
- Protección ante filtraciones de base de datos.

---

### Control de acceso

Se implementó RBAC mediante middlewares independientes.

Se decidió separar:

verifyToken

y

requireRole

porque cumplen responsabilidades diferentes.

Esto facilita la reutilización y sigue el principio Single Responsibility Principle (SRP).

---

### Flujo Git

Se adopta un Git Flow simplificado.

main
↓

dev
↓

feat/\*

Cada funcionalidad se desarrolla en una rama independiente antes de integrarse.

---

### Futuras mejoras

- Google OAuth.
- Refresh Tokens.
- Recuperación de contraseña.
- Cookies httpOnly.

# Mini Sprint 2.1 - Specialty

## Decisiones de arquitectura

### Soft Delete

Las especialidades no se eliminan físicamente.

Se utiliza:

active = false

Esto conserva la integridad histórica de las citas, servicios y reportes.

---

### Seguridad

Las operaciones de escritura sobre Specialties son exclusivas del Administrador.

Las operaciones de lectura están disponibles para cualquier usuario autenticado.

---

### Validaciones

- name único.
- trim.
- timestamps automáticos.
- runValidators en actualizaciones.

---

### Mejoras futuras

- Endpoint Restore.
- Middleware global de errores.
- Respuestas de error más amigables.
- Colección oficial de Postman.
