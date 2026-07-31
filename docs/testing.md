# Testing - MarmaCitas

## Sprint 1 - Autenticación y Roles

Fecha: 01/07/2026

### Objetivo

Validar el funcionamiento del sistema de autenticación basado en JWT y la autorización mediante roles (RBAC).

---

## Casos de prueba

| ID    | Caso                                 | Usuario | Resultado esperado | Estado |
| ----- | ------------------------------------ | ------- | ------------------ | ------ |
| T-001 | Login paciente                       | patient | Login exitoso      | ✅     |
| T-002 | Login administrador                  | admin   | Login exitoso      | ✅     |
| T-003 | Acceso a /profile como paciente      | patient | HTTP 200           | ✅     |
| T-004 | Acceso a /profile como administrador | admin   | HTTP 200           | ✅     |
| T-005 | Acceso a /admin como paciente        | patient | HTTP 403           | ✅     |
| T-006 | Acceso a /admin como administrador   | admin   | HTTP 200           | ✅     |

---

## Resultado

Todos los casos de prueba fueron satisfactorios.

Estado del Sprint:

✅ APROBADO

# Mini Sprint 2.1 - Specialty

## Estado

Finalizado

## Resultado

8 de 8 pruebas aprobadas.

## Casos de prueba

| ID     | Caso                   | Resultado |
| ------ | ---------------------- | --------- |
| SP-001 | Crear especialidad     | ✅        |
| SP-002 | Especialidad duplicada | ✅        |
| SP-003 | Listar especialidades  | ✅        |
| SP-004 | Obtener por ID         | ✅        |
| SP-005 | Actualizar             | ✅        |
| SP-006 | Soft Delete            | ✅        |
| SP-007 | No listar desactivadas | ✅        |
| SP-008 | Seguridad              | ✅        |

## Observaciones

- Se implementó correctamente Soft Delete.
- Se validó la restricción unique.
- Se comprobó JWT.
- Se comprobó autorización por roles.

# Mini Sprint 2.2 - Service

## Estado

Finalizado

## Resultado

11 de 11 pruebas aprobadas.

## Casos de prueba

| ID      | Caso                          | Resultado |
| ------- | ----------------------------- | --------- |
| PRE-001 | Preparación del entorno       | ✅        |
| SV-001  | Crear servicio                | ✅        |
| SV-002  | Especialidad inexistente      | ✅        |
| SV-003  | Especialidad inactiva         | ✅        |
| SV-004  | Duplicado                     | ✅        |
| SV-005  | Listar                        | ✅        |
| SV-006  | Obtener por ID                | ✅        |
| SV-007  | Actualizar                    | ✅        |
| SV-008  | Soft Delete                   | ✅        |
| SV-009  | No listar servicios inactivos | ✅        |
| SV-010  | Seguridad                     | ✅        |

## Observaciones

- Se implementó la relación entre Service y Specialty.
- Se utilizó populate() para obtener la información de la especialidad.
- Se validó la existencia y estado de la especialidad antes de crear servicios.
- Se implementó Soft Delete.
- Se verificó autorización mediante JWT y Roles.
