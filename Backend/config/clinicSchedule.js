/**
 * =====================================================
 * Config: Jornada de la clínica
 * -----------------------------------------------------
 * La disponibilidad y los horarios de los odontólogos
 * deben respetar siempre la jornada fija del consultorio
 * (lunes a viernes):
 *
 * - Mañana: 08:00 - 12:00
 * - Tarde:  14:00 - 17:00
 *
 * Los horarios individuales se representan con
 * startTime/endTime + breakStart/breakEnd opcionales.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

export const CLINIC_SEGMENTS = [
  { start: "08:00", end: "12:00" },
  { start: "14:00", end: "17:00" },
];

export const CLINIC_SEGMENTS_MINUTES = CLINIC_SEGMENTS.map((segment) => ({
  start: timeToMinutes(segment.start),
  end: timeToMinutes(segment.end),
}));

export const CLINIC_BREAK_START = "12:00";
export const CLINIC_BREAK_END = "14:00";

export const CLINIC_HOURS_MESSAGE =
  "El horario debe estar dentro de la jornada de la clínica (08:00-12:00 y 14:00-17:00).";

/**
 * Construir los tramos (en minutos) del horario de un
 * odontólogo a partir de startTime/endTime y la pausa
 * opcional breakStart/breakEnd.
 */
export const buildDoctorSegmentsMinutes = ({
  startTime,
  endTime,
  breakStart,
  breakEnd,
}) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (breakStart && breakEnd) {
    return [
      { start, end: timeToMinutes(breakStart) },
      { start: timeToMinutes(breakEnd), end },
    ];
  }

  return [{ start, end }];
};

/**
 * Intersección entre dos listas de intervalos en minutos.
 * Devuelve los tramos resultantes no vacíos.
 */
export const intersectMinutesSegments = (a, b) => {
  const result = [];

  for (const segmentA of a) {
    for (const segmentB of b) {
      const start = Math.max(segmentA.start, segmentB.start);
      const end = Math.min(segmentA.end, segmentB.end);

      if (start < end) {
        result.push({ start, end });
      }
    }
  }

  return result;
};

/**
 * Indica si el horario completo del odontólogo (incluida
 * la pausa) queda dentro de la jornada de la clínica.
 */
export const scheduleFitsClinicHours = ({
  startTime,
  endTime,
  breakStart,
  breakEnd,
}) => {
  const segments = buildDoctorSegmentsMinutes({
    startTime,
    endTime,
    breakStart,
    breakEnd,
  });

  return segments.every((segment) =>
    CLINIC_SEGMENTS_MINUTES.some(
      (clinicSegment) =>
        segment.start >= clinicSegment.start && segment.end <= clinicSegment.end,
    ),
  );
};