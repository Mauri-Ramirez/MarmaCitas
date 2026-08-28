# MARMA CITAS — ROADMAP MAESTRO OFICIAL

## 1. Estado actual del proyecto

MarmaCitas utiliza:

- Backend: Node.js + Express + Mongoose + MongoDB + JWT + bcryptjs.
- Frontend: React + Vite + React Router + Axios + Tailwind.
- Arquitectura separada Backend / Frontend.
- Autenticación basada en JWT.
- Roles:
  - patient
  - doctor
  - receptionist
  - admin

Entidades persistentes actuales:

- User
- Specialty
- Service
- Schedule
- Appointment

Entidades que todavía NO existen:

- ClinicalHistory / historial clínico
- Payment
- Notification
- disponibilidad persistida
- perfil separado de paciente
- historial de reprogramaciones
- historial de cambios de estado

---

## 2. Trabajo completado

### Fase 1 — Backend base

Estado: COMPLETADA

Incluye:

- conexión MongoDB
- Express
- configuración del servidor
- modelos base
- autenticación
- JWT
- bcrypt
- middleware verifyToken
- middleware requireRole

### Fase 2 — Módulos de dominio

Estado: COMPLETADA

Incluye:

- User
- Specialty
- Service
- Doctor
- Schedule
- relaciones entre entidades
- CRUD administrativos existentes
- soft delete donde corresponde

### Fase 3 — Autenticación y RBAC

Estado: FUNCIONAL

Incluye:

- registro de paciente
- login
- generación de JWT
- persistencia de token
- restauración de sesión mediante /api/users/me
- PrivateRoute
- navegación por rol
- Sidebar por rol
- protección backend mediante verifyToken + requireRole

Pendientes técnicos de hardening:

- usuario desactivado con token válido
- rol obsoleto dentro del JWT
- logout sin revocación server-side
- token almacenado en localStorage
- manejo global de 401/403
- validación de Bearer
- recuperación de contraseña
- refresh token
- CORS
- validación de entrada

### Fase 4 — Sistema de citas

Estado: COMPLETADA PARA EL ALCANCE ACTUAL

Incluye:

- creación de cita
- consulta de citas del paciente
- consulta de citas del odontólogo
- disponibilidad dinámica
- validación de solapamientos
- validación de horario laboral
- validación de servicio/especialidad
- cancelación
- reprogramación
- cambio de estado
- serviceSnapshot
- auditoría básica
- manejo de zona horaria Colombia/UTC

### Fase 5 — Frontend del paciente

Estado: FUNCIONAL

Incluye:

- login
- registro
- dashboard básico
- agendamiento
- disponibilidad
- selección de horario
- resumen
- creación de cita
- Mis citas
- cancelación
- reprogramación

---

## 3. Próximas fases de desarrollo

## Sprint 3.2 — Perfil del paciente

Estado: PENDIENTE

Objetivo:

Crear el perfil funcional del paciente utilizando:

GET /api/users/me
PUT /api/users/me

Debe incluir:

- visualizar nombre
- visualizar correo
- visualizar rol
- visualizar estado
- editar los campos realmente permitidos por el backend
- manejar loading
- manejar errores
- validar correctamente la actualización

Después:

- pruebas funcionales
- pruebas negativas
- actualización de contexto/sesión si corresponde

## Sprint 3.3 — Perfil y agenda del odontólogo

Estado: PENDIENTE

Objetivo:

Crear el primer perfil profesional completamente funcional.

Incluye:

- dashboard odontólogo
- /odontologo/citas
- GET /api/appointments/doctor
- listado de pacientes
- servicio
- fecha
- hora
- estado
- cambio de estado

Estados principales:

confirmed
→ in_progress
→ completed

También:

confirmed
→ no_show

El odontólogo solo debe poder modificar estados de sus propias citas.

También implementar:

- /odontologo/perfil
- /odontologo/horario

Aprovechar los endpoints existentes antes de crear nuevos.

## Sprint 3.4 — Perfil de recepción

Estado: PENDIENTE

Objetivo:

Crear el módulo operativo del consultorio.

Incluye:

- dashboard recepción
- /recepcion/citas
- /recepcion/pacientes
- /recepcion/odontologos
- /recepcion/perfil

Funciones principales:

- consultar citas
- gestionar citas
- consultar pacientes
- consultar odontólogos
- operaciones autorizadas sobre citas

IMPORTANTE:

Antes de implementar creación de citas desde recepción, corregir la inconsistencia actual del backend:

Las rutas permiten receptionist/admin para crear citas, pero el controlador utiliza req.user.id como paciente.

Diseñar una solución para que recepción/admin puedan seleccionar al paciente correcto sin romper el flujo actual de paciente.

## Sprint 3.5 — Administración

Estado: PENDIENTE

Objetivo:

Convertir los CRUD existentes del backend en interfaces administrativas funcionales.

### Administración de odontólogos

/admin/odontologos

- listar
- crear
- editar
- desactivar

### Administración de especialidades

/admin/especialidades

- listar
- crear
- editar
- desactivar

### Administración de servicios

/admin/servicios

- listar
- crear
- editar
- desactivar

### Administración de horarios

/admin/horarios

- listar
- crear
- editar
- desactivar

### Administración de citas

/admin/citas

- consultar
- reprogramar según permisos
- cancelar según permisos
- cambiar estado según permisos

### Perfil administrador

/admin/perfil

## Sprint 3.6 — Gestión de usuarios

Estado: PENDIENTE

Primero revisar y definir el alcance real del userController.

Objetivo potencial:

/admin/usuarios

Funciones a evaluar:

- listar usuarios
- consultar usuarios
- activar/desactivar
- gestionar roles según reglas del proyecto
- editar información permitida
- diferenciar pacientes, odontólogos, recepción y administración

No implementar hasta definir las reglas exactas de seguridad y autorización.

## Sprint 3.7 — Historia clínica

Estado: NO IMPLEMENTADA

Actualmente NO existen modelos ni endpoints clínicos.

Antes de programar:

- definir alcance funcional
- definir modelo de datos
- definir relación paciente/cita/odontólogo
- definir información clínica
- definir permisos de lectura/escritura
- definir privacidad

Posibles componentes futuros:

- expediente clínico
- evoluciones
- diagnósticos
- tratamientos
- observaciones clínicas
- odontograma si entra en alcance

No asumir que todas estas funcionalidades son obligatorias.

## Sprint 3.8 — Pagos

Estado: NO IMPLEMENTADO

Actualmente solo existe:

paymentStatus:
- pending
- paid

No existe entidad Payment.

Antes de implementar:

- definir alcance
- determinar si será registro manual o pago online
- definir método de pago
- monto
- fecha
- responsable
- comprobante
- reembolsos, si aplican

No implementar una pasarela de pago hasta que el alcance esté definido.

## Sprint 3.9 — Notificaciones y recordatorios

Estado: NO IMPLEMENTADO

Evaluar:

- recordatorios de citas
- confirmaciones
- cancelaciones
- reprogramaciones
- correo
- WhatsApp
- preferencias de comunicación

Primero definir alcance y tecnología.

---

## 4. Sprint de hardening técnico

## Sprint 3.10 — Seguridad y robustez

Estado: PENDIENTE

Revisar:

- usuario desactivado con JWT válido
- cambios de rol
- revocación de sesión
- almacenamiento del token
- interceptor global 401/403
- CORS
- validación de inputs
- errores globales
- encabezado Bearer
- seguridad de endpoints
- condiciones de carrera de disponibilidad
- índices MongoDB
- manejo de errores Mongoose
- zona horaria centralizada

IMPORTANTE:

No aplicar todas las mejoras automáticamente.
Primero clasificar:

CRÍTICO
ALTO
MEDIO
BAJO
FUTURO

---

## 5. Sprint de UX/UI

## Sprint 3.11 — Consolidación visual

Estado: PENDIENTE

Objetivo:

Convertir la funcionalidad existente en una aplicación coherente y profesional.

Incluye:

- Sidebar
- Navbar
- layouts
- dashboards
- tablas
- formularios
- modales
- estados vacíos
- loading
- mensajes de éxito/error
- responsive
- accesibilidad básica
- consistencia visual

Mantener la identidad visual definida por el diseño inicial del proyecto.

No priorizar estética sobre funcionalidad.

---

## 6. Sprint de pruebas integrales

## Sprint 3.12 — QA final

Estado: PENDIENTE

Cobertura:

### Autenticación

- registro
- login
- F5
- cierre/reapertura
- logout
- token inválido
- usuario inactivo

### Roles

- patient
- doctor
- receptionist
- admin

### Citas

- crear
- disponibilidad
- solapamientos
- cancelación
- reprogramación
- estados
- zona horaria

### Administración

- CRUD
- permisos
- soft delete

### Frontend

- rutas
- formularios
- loading
- errores
- sesiones
- navegación

Definir posteriormente una estrategia de pruebas automatizadas.

---

## 7. Sprint de documentación

## Sprint 3.13 — Documentación final

Actualizar:

docs/api.md
docs/arquitectura.md
docs/roadmap.md
docs/domain-model.md
docs/decisiones-tecnicas.md
docs/testing.md
docs/appointment-rules.md
docs/doctor-rules.md
docs/service-rules.md
docs/schedule-rules.md

Objetivo:

La documentación debe reflejar el código real, no funcionalidades futuras como si ya existieran.

Crear posteriormente, si se necesita:

- guía de autenticación
- especificación API
- modelo de historia clínica
- modelo de pagos
- notificaciones
- despliegue

---

## 8. Estado global

### COMPLETADO

- Backend base
- autenticación básica
- JWT
- RBAC
- User
- Specialty
- Service
- Doctor
- Schedule
- Appointment
- disponibilidad
- creación de citas
- cancelación
- reprogramación
- estados básicos
- frontend paciente
- Mis citas

### PARCIAL

- perfiles
- dashboards
- gestión de usuarios
- administración
- recepción
- seguridad avanzada
- documentación
- pruebas automatizadas

### NO IMPLEMENTADO

- historia clínica
- pagos
- notificaciones
- recordatorios
- automatización de pruebas
- UX/UI final

---

## 9. Orden oficial de ejecución

1. Sprint 3.2 — Perfil paciente
2. Sprint 3.3 — Perfil y agenda odontólogo
3. Sprint 3.4 — Recepción
4. Sprint 3.5 — Administración
5. Sprint 3.6 — Gestión de usuarios
6. Sprint 3.7 — Historia clínica
7. Sprint 3.8 — Pagos
8. Sprint 3.9 — Notificaciones
9. Sprint 3.10 — Hardening
10. Sprint 3.11 — UX/UI
11. Sprint 3.12 — QA final
12. Sprint 3.13 — Documentación final

---

## 10. Reglas de trabajo del proyecto

- Trabajar sobre la rama dev.
- Mantener main como rama estable.
- No modificar funcionalidades terminadas sin motivo.
- Antes de implementar una funcionalidad nueva, verificar si el backend ya la soporta.
- Backend y frontend deben evolucionar de forma coordinada.
- Probar primero el backend cuando corresponda.
- Después integrar mediante services React.
- Después construir la interfaz.
- Cada funcionalidad debe tener pruebas.
- Las reglas de negocio deben permanecer en backend.
- El frontend no debe ser la autoridad para permisos o disponibilidad.
- No crear modelos o funcionalidades futuras hasta definir su alcance.
- Registrar decisiones técnicas importantes en docs/.
- Al terminar un bloque estable, hacer commit y push a dev.

---

## 11. Criterio de finalización del proyecto

MarmaCitas se considerará listo cuando:

- Los cuatro roles tengan flujos funcionales.
- Las operaciones principales estén integradas frontend/backend.
- Las reglas de negocio críticas estén cubiertas.
- Las rutas estén protegidas correctamente.
- Los módulos principales tengan pruebas.
- La información mostrada coincida con MongoDB.
- La gestión de fechas sea consistente con America/Bogota.
- No existan enlaces frontend hacia rutas inexistentes.
- La documentación refleje el estado real.
- Se haya ejecutado una ronda final de seguridad y pruebas.
- main contenga únicamente una versión estable y revisada.
