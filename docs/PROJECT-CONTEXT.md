# MarmaCitas — Contexto operativo

Este documento resume el estado confirmado del repositorio. El código real prevalece si este archivo
queda desactualizado.

## Propósito

MarmaCitas es una aplicación web para gestionar usuarios, catálogo odontológico, horarios y citas de
una clínica dental.

## Stack y arquitectura

### Backend

- Node.js con ES modules, Express 5 y Mongoose sobre MongoDB.
- Base de datos definida en `MONGO_URI` (base `marmacitas`). Los tests usan `marmacitas_test` mediante
  la opción `dbName`; ambas viven en el mismo cluster Atlas y están aisladas.
- Autenticación JWT, contraseñas con `bcryptjs`, `dotenv` y CORS.
- Punto de entrada: `Backend/server.js`.
- Organización por `config`, `models`, `controllers`, `routes`, `middlewares` y `scripts`.
- Los controllers concentran acceso a datos, validaciones y reglas de negocio; no hay capa de
  servicios/repositorios.
- Grupos de API: `/api/auth`, `/api/users`, `/api/specialties`, `/api/services`, `/api/doctors`,
  `/api/schedules` y `/api/appointments`.

### Frontend

- React 19, Vite, Tailwind CSS 4, React Router y Axios.
- Organizado por páginas, layouts, componentes, servicios HTTP, contexto de autenticación y rutas.
- `AuthContext` restaura la sesión mediante `/users/me` y conserva el JWT en `localStorage`.
- `PrivateRoute` restringe rutas por rol; el backend reaplica autenticación y RBAC.
- Axios usa `VITE_API_URL` (variable de entorno de Vite). Para desarrollo local se documenta
  `http://localhost:5000/api` en `Frontend/.env.example`.

## Roles y entidades

Roles definidos en `User`: `patient`, `doctor`, `receptionist`, `admin`.

Entidades Mongoose:

- `User`: usuarios y estado activo; rol dentro de los cuatro definidos. Los doctores requieren
  licencia, teléfono y especialidad. Los pacientes pueden tener `allergies` y `medicalNotes`
  (editables solo por el paciente vía `PUT /users/me`; visibles para recepción/admin y para el
  odontólogo en su agenda).
- `Specialty`: especialidad con soft delete (`active`); nombre único.
- `Service`: servicio asociado a una especialidad, con duración, precio y soft delete.
- `Schedule`: horario de un odontólogo con `startTime`, `endTime` y pausa opcional
  (`breakStart`/`breakEnd`); un único horario activo por doctor.
- `Appointment`: cita entre paciente, doctor y servicio, con `dateTime`, estados, `paymentStatus`,
  snapshot del servicio (`serviceSnapshot`), `reason` (motivo de consulta), `clinicalNotes` (nota de
  atención del odontólogo) y `attachments` (adjuntos clínicos), auditoría básica y control optimista.

## Horario de clínica

- Jornada fija: `08:00–12:00` y `14:00–17:00` (`Backend/config/clinicSchedule.js`).
- La disponibilidad y la validación de citas usan la **intersección** del horario del odontólogo
  (incluida su pausa) con la jornada de la clínica, en `America/Bogota`.
- Un odontólogo puede tener solo un horario activo (índice único parcial).

## Reglas de citas

- **Disponibilidad:** por odontólogo y por servicio, en cadencia de 15 minutos, de lunes a viernes,
  dentro de la jornada efectiva; omitiendo horas ya pasadas y citas confirmadas/en curso. Los slots
  que compiten con citas del paciente solo se validan al crear la cita.
- **Creación:** paciente/recepción/admin (recepción/admin envían `patientId`). Exige actores activos,
  servicio activo de la misma especialidad del doctor, fecha futura, jornada efectiva, duración
  completa y sin solapamientos de doctor ni de paciente.
- **Estados:** `confirmed → in_progress | cancelled | no_show`; `in_progress → completed`.
  `in_progress` admite hasta 15 minutos de anticipación; `no_show` solo desde la hora exacta de la
  cita.
- **Cancelación:** solo el **paciente** está sujeto a un mínimo de **24 horas** de anticipación
  (endpoint `DELETE /appointments/:id`). Recepción y admin pueden cancelar con menos de 24 horas.
  El **odontólogo no puede cancelar citas** (guard en `PATCH /appointments/:id/status`).
- **Reprogramación:** solo `confirmed`; la cita original debe ser futura; para el paciente la original
  debe tener al menos 24 horas (evita eludir la cancelación). Recepción/admin no tienen esa
  restricción de anticipación. No se registra quién reprogramó.
- **Notas clínicas (`clinicalNotes`):** solo el odontólogo propietario y solo mientras la cita está
  `in_progress`; máximo 2000 caracteres; al pasar a `completed` (o en `confirmed`/`cancelled`/
  `no_show`) quedan cerradas. Sin auditoría específica de autor/fecha.
- **Motivo de consulta (`reason`):** lo escribe el paciente al agendar (o recepción/admin). Es distinto
  de la nota clínica.
- **Adjuntos clínicos:** PDF/JPG/JPEG/PNG, máx. 5 por cita, máx. 10 MB por archivo, solo `in_progress`
  y solo el doctor de la cita. No hay servido público; se descargan por endpoint autenticado.
- El paciente **no recibe** `clinicalNotes` ni `attachments` desde la API.

## Integridad administrativa

- **Desactivar un odontólogo** (por `DELETE /doctors/:id` o `PATCH /users/:id/active`) se bloquea
  (409) si tiene citas `in_progress` o `confirmed` futuras.
- **Modificar un horario** (`PUT /schedules/:id`) se bloquea (409) si el nuevo horario deja fuera de
  cobertura alguna cita futura `confirmed` que sí estaba cubierta por el horario actual (regla
  comparativa; las citas legacy ya descubiertas no bloquean).

## Frontend por rol

- **Público:** inicio, login y registro (el registro crea pacientes).
- **Paciente:** dashboard, agendar (especialidad → servicio → fecha → hora → odontólogo), mis citas
  (próximas/historial), cancelar/reprogramar con las reglas del backend (la UI de cancelación oculta
  el botón si faltan 24 h), perfil con datos médicos.
- **Odontólogo:** dashboard, agenda maestro-detalle (Próximas/Hoy/Historial, agrupada por fecha),
  iniciar/finalizar atención, notas clínicas, adjuntos, perfil profesional con horario integrado.
- **Recepción:** dashboard con métricas del día, agendar (página dedicada), citas (tabs + búsqueda +
  modal), pacientes (búsqueda por nombre/correo/teléfono, ficha con últimas citas), odontólogos y
  perfil.
- **Admin:** dashboard con estadísticas reales, agendar (página dedicada), usuarios (activar/
  desactivar con guard anti-autodesactivación, editar pacientes), odontólogos (crear con horario,
  detalle, editar, desactivar), catálogo (Especialidades y Servicios con tabs), citas y perfil.

## Pruebas

- Backend: **14 suites, 148/148 tests** (`npm test` en `Backend`, `node:test`). Usan la base
  `marmacitas_test` (borran colecciones en cada ejecución) y el directorio aislado `uploads-test`
  para adjuntos.
- Frontend: `npm run lint` con **0 errores** y `npm run build` **exitoso**.
- Sin CI ni suite de pruebas frontend/E2E permanente.

## Limitaciones y funcionalidades fuera de alcance

- **Pagos:** solo existe `paymentStatus` (pending/paid); no hay endpoint ni interfaz para registrarlos.
- **Recuperación/activación de contraseña** por correo: no implementada. Los pacientes creados por
  recepción reciben una contraseña aleatoria que no se entrega.
- **Notificaciones y recordatorios:** no implementados.
- **Historia clínica global:** no existe. El odontólogo ve "Atenciones anteriores" derivadas solo de
  sus propias citas.
- Sin odontograma, diagnósticos estructurados ni tratamientos.
- Las vistas administrativas de citas usan ventanas de ±30 días.
- La disponibilidad no anticipa conflictos del paciente (se validan al crear).
- No hay auditoría de quién reprograma ni de quién escribe las notas.
- CORS abierto, sin rate limiting, sin middleware global de errores (varios 500 devuelven
  `error.message`).
- Validación de horario con limitación para duraciones que crucen de día (compara hora/minuto).

No se presentan funcionalidades futuras como implementadas.