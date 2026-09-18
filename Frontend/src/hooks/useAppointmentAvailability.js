import { useEffect, useMemo, useState } from "react";

import { getAppointmentAvailability } from "../services/appointmentService";

export function useAppointmentAvailability({
  serviceId,
  date,
  doctors,
  services,
}) {
  const [doctorSlots, setDoctorSlots] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityVersion, setAvailabilityVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadAvailability = async () => {
      if (!serviceId || !date) {
        setDoctorSlots({});
        return;
      }

      const serviceData = services.find(
        (service) => service._id === serviceId,
      );

      const specialtyDoctors = serviceData
        ? doctors.filter(
            (doctor) =>
              doctor.specialty?._id === serviceData.specialty?._id,
          )
        : [];

      if (specialtyDoctors.length === 0) {
        setDoctorSlots({});
        return;
      }

      try {
        setLoadingAvailability(true);

        const results = await Promise.allSettled(
          specialtyDoctors.map((doctor) =>
            getAppointmentAvailability({
              doctorId: doctor._id,
              serviceId,
              date,
            }).then((data) => ({
              doctorId: doctor._id,
              slots: data.availableSlots ?? [],
            })),
          ),
        );

        if (cancelled) {
          return;
        }

        const slotsByDoctor = {};

        for (const result of results) {
          if (result.status === "fulfilled") {
            slotsByDoctor[result.value.doctorId] = result.value.slots;
          }
        }

        setDoctorSlots(slotsByDoctor);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Error al consultar la disponibilidad:", error);

        setDoctorSlots({});
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    };

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [serviceId, date, availabilityVersion, services, doctors]);

  const unionSlots = useMemo(
    () => [...new Set(Object.values(doctorSlots).flat())].sort(),
    [doctorSlots],
  );

  const refreshAvailability = () => {
    setAvailabilityVersion((version) => version + 1);
  };

  return {
    doctorSlots,
    unionSlots,
    loadingAvailability,
    refreshAvailability,
  };
}