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
- Fecha
- Hora
- Estado

No puede existir una cita sin alguno de estos datos.

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

---

# Disponibilidad

- Un odontólogo no puede tener dos citas en el mismo horario.
- Un paciente no puede tener dos citas en el mismo horario.
- Solo se mostrarán horarios disponibles.
- No se podrán reservar horarios fuera del horario laboral del odontólogo.

---

# Atención

Cuando llega la fecha de la cita:

1. El odontólogo inicia la atención.
2. La cita cambia al estado **En curso**.
3. El odontólogo registra el diagnóstico y tratamiento.
4. La cita cambia al estado **Completada**.
5. Se genera el historial clínico.

---

# Estados de una cita

- Confirmada
- En curso
- Completada
- Cancelada
- No asistió

---

# Flujo de Estados

Confirmada
│
├── En curso
│ │
│ └── Completada
│
├── Cancelada
│
└── No asistió

---

# Cancelación

Puede cancelar:

- Paciente
- Recepcionista
- Administrador

No puede cancelar:

- Odontólogo

La cancelación debe realizarse con un mínimo de **24 horas de anticipación**.

---

# Reprogramación

Puede reprogramar:

- Paciente
- Recepcionista
- Administrador

Condiciones:

- Debe existir disponibilidad.
- La cita mantiene el estado **Confirmada**.
- Se registra la modificación en el historial.

---

# Historial

Las citas nunca se eliminan.

Las citas canceladas y las inasistencias permanecen registradas para mantener la trazabilidad.

---

# Auditoría

Cada cita conservará:

- Fecha de creación.
- Última modificación.
- Usuario que creó la cita.
- Usuario que realizó el último cambio de estado.

---

# Servicio Odontológico

Cada cita almacenará una instantánea (snapshot) del servicio:

- serviceId
- Nombre del servicio
- Duración
- Precio

Esto garantiza conservar el historial incluso si el servicio cambia posteriormente.

---

# Pago

En la versión MVP:

- El pago será un módulo independiente.
- El pago no condiciona la creación de la cita.
- La recepcionista podrá registrar el pago posteriormente.

En versiones futuras se podrá implementar pago anticipado en línea.

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
