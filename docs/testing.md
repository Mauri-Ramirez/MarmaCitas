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

---

# Estado actual (verificado)

## Backend

- **14 suites** de pruebas con `node:test`, ejecutables con `npm test` en `Backend`.
- **Resultado verificado: 148/148 tests en verde.**
- Las suites cubren, entre otras:
  - autenticación y RBAC (usuario activo/rol vigente desde BD, token inválido, roles);
  - pacientes y perfiles (incluida la búsqueda por teléfono);
  - listados de doctores;
  - citas: disponibilidad, pausa, jornada clínica, conflictos, estados, notas, motivo (`reason`);
  - concurrencia (creación/reprogramación/cancelación con locks y control optimista);
  - activación/desactivación de usuarios (guard anti-autodesactivación);
  - integridad administrativa (desactivación de odontólogo y modificación de horario con citas
    futuras);
  - adjuntos (límites, aislamiento de directorio, descarga protegida).

### Bases y almacenamiento de pruebas

- Las suites usan la base **`marmacitas_test`** (aislada de `marmacitas`).
- **Naturaleza destructiva:** borran colecciones en cada ejecución (`deleteMany`). No ejecutar contra
  una base con datos reales.
- La suite de adjuntos usa un directorio **`uploads-test`** aislado y nunca toca `uploads/` reales.
- Ejecución serializada con `--test-concurrency=1`.

## Frontend

- `npm run lint` → **0 errores** (verificado).
- `npm run build` → **exitoso** (verificado).
- No existe suite de pruebas frontend ni E2E permanente en el repositorio.

## Límites

- No hay CI automatizado.
- No hay suite frontend/E2E permanente.
- No se afirma ningún resultado distinto del verificado aquí.

---

## Histórico

Las secciones anteriores de este documento corresponden a sprints iniciales (autenticación y roles,
especialidades y servicios) y se conservan como registro histórico, no como descripción del estado
actual del sistema.
