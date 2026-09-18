# Reglas de Negocio - Gestión de Citas

## Objetivo

Definir las reglas funcionales del módulo de gestión de citas de MarmaCitas para un consultorio odontológico pequeño.

---

# Actores

- Paciente
- Recepcionista
- Odontólogo
- Administrador

---

# Creación de citas

Una cita debe tener obligatoriamente:

- Paciente
- Odontólogo
- Servicio odontológico
- Fecha y hora
- Estado de la cita
- Estado del pago

No puede existir una cita sin alguno de estos datos.

La fecha y hora de la cita se almacenarán mediante un único valor `dateTime`.

---

# Flujo de Reserva

1. El paciente inicia sesión.
2. Selecciona el servicio odontológico.
3. El sistema identifica la especialidad requerida.
4. El sistema muestra únicamente los odontólogos de esa especialidad.
5. El paciente selecciona el odontólogo.
6. El sistema consulta la disponibilidad.
7. El paciente selecciona fecha y hora.
8. Confirma la reserva.
9. La cita queda inmediatamente en estado **Confirmada**.
10. El estado del pago se gestiona de forma independiente.

---

# Validaciones para crear una cita

Para crear una cita deben cumplirse las siguientes condiciones:

- El paciente debe existir y estar activo.
- El odontólogo debe existir y estar activo.
- El usuario asociado al odontólogo debe tener rol `doctor`.
- El servicio debe existir y estar activo.
- La especialidad del servicio debe coincidir con la especialidad del odontólogo.
- La fecha y hora de la cita no pueden encontrarse en el pasado.
- La cita debe encontrarse dentro del horario laboral del odontólogo.
- El espacio completo correspondiente a la duración del servicio debe encontrarse disponible.
- El paciente no puede tener otra cita que se solape con el mismo período.
- El odontólogo no puede tener otra cita que se solape con el mismo período.

---

# Disponibilidad

Un odontólogo no puede tener dos citas que se solapen.

Un paciente no puede tener dos citas que se solapen.

La duración del servicio determina el espacio de tiempo ocupado por la cita.

Ejemplo:

```text
Servicio: Valoración
Duración: 30 minutos

Cita:
14:00 → 14:30
```

Una cita que comience a las `14:15` no estará permitida porque existe un solapamiento.

Una cita que comience a las `14:30` podrá ser permitida si cumple las demás reglas de disponibilidad.

---

# Horario laboral

La cita debe encontrarse completamente dentro del horario laboral activo del odontólogo.

Ejemplo:

```text
Horario del odontólogo:

08:00 → 17:00
```

Una cita de 30 minutos a las:

```text
16:30 → 17:00
```

es válida.

Una cita de 30 minutos a las:

```text
16:45 → 17:15
```

no es válida porque supera el horario laboral.

Los horarios del consultorio corresponden a los días laborales de lunes a viernes.

---

# Especialidad

El servicio seleccionado debe pertenecer a la misma especialidad del odontólogo.

Ejemplo válido:

```text
Odontólogo
Especialidad: Ortodoncia

Servicio
Especialidad: Ortodoncia
```

Ejemplo inválido:

```text
Odontólogo
Especialidad: Ortodoncia

Servicio
Especialidad: Endodoncia
```

En este caso la cita no podrá ser creada.

---

# Atención

Cuando llega la fecha de la cita:

1. El odontólogo inicia la atención.
2. La cita cambia al estado **En curso**.
3. El odontólogo registra el diagnóstico y tratamiento.
4. La cita cambia al estado **Completada**.
5. Se genera o actualiza el historial clínico.

---

# Estados de una cita

- `confirmed` - Confirmada
- `in_progress` - En curso
- `completed` - Completada
- `cancelled` - Cancelada
- `no_show` - No asistió

---

# Flujo de Estados

```text
Confirmada
│
├── En curso
│   │
│   └── Completada
│
├── Cancelada
│
└── No asistió
```

Una cita cancelada o marcada como no asistió no vuelve al estado Confirmada mediante el flujo normal.

---

# Estado del pago

El estado del pago se manejará independientemente del estado de la cita.

Estados iniciales:

- `pending` - Pendiente
- `paid` - Pagado

La creación de una cita no depende de que el pago haya sido realizado previamente.

---

# Pago

En la versión MVP:

- El pago será un módulo independiente.
- El pago no condiciona la creación de la cita.
- La cita puede crearse aunque el pago se encuentre pendiente.
- La recepcionista podrá registrar o confirmar posteriormente el pago.
- `paymentStatus` permitirá conocer el estado actual del pago asociado a la cita.

En versiones futuras se podrá implementar pago anticipado en línea.

---

# Cancelación

Puede cancelar:

- Paciente
- Recepcionista
- Administrador

No puede cancelar:

- Odontólogo

La cancelación debe realizarse con un mínimo de **24 horas de anticipación**.

Las citas canceladas permanecen almacenadas para mantener la trazabilidad.

---

# Reprogramación

Puede reprogramar:

- Paciente
- Recepcionista
- Administrador

Condiciones:

- Debe existir disponibilidad para la nueva fecha y hora.
- La nueva fecha debe encontrarse dentro del horario laboral del odontólogo.
- El espacio completo correspondiente a la duración del servicio debe estar disponible.
- No debe existir solapamiento con otra cita del paciente.
- No debe existir solapamiento con otra cita del odontólogo.
- La cita mantiene el estado **Confirmada**.
- Se actualiza `dateTime`.
- Se registra la modificación mediante los campos de auditoría correspondientes.

---

# Historial

Las citas nunca se eliminan físicamente.

Las citas canceladas y las inasistencias permanecen registradas para mantener la trazabilidad del sistema.

---

# Auditoría

Cada cita conservará:

- Fecha de creación.
- Fecha de última modificación.
- Usuario que creó la cita.
- Usuario que realizó el último cambio de estado.

Los campos de auditoría permitirán identificar quién realizó las principales acciones sobre la cita.

---

# Servicio Odontológico

Cada cita almacenará una instantánea (snapshot) del servicio utilizado al momento de crear la cita.

El snapshot conservará:

- `serviceId`
- Nombre del servicio
- Duración
- Precio

Esto garantiza conservar el historial de la cita incluso si posteriormente el servicio cambia de nombre, duración o precio.

---

# Notas

La cita podrá almacenar observaciones relacionadas con su gestión.

Las notas clínicas propias de la atención odontológica serán gestionadas posteriormente mediante el módulo correspondiente al historial clínico y atención odontológica.

---

# Notificaciones (Backlog)

Enviar notificaciones cuando:

- Se crea una cita.
- Se cancela una cita.
- Se reprograma una cita.
- Se acerca la fecha de la cita.

---

# Mejoras Futuras

- Pago anticipado.
- Integración con Google Calendar.
- Confirmación por correo.
- Recordatorios automáticos.
- Integración con servicios de notificación.
