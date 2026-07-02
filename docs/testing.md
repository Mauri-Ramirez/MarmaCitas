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
