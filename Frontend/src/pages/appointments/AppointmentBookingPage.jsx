import { useEffect, useState } from "react";

import { Link, useLocation } from "react-router-dom";

import { createAppointment } from "../../services/appointmentService";
import { getDoctors } from "../../services/doctorService";
import { getServices } from "../../services/serviceService";
import { getSpecialties } from "../../services/specialtyService";
import { getPatients } from "../../services/patientService";

import AppointmentBookingFields from "../../components/appointments/AppointmentBookingFields";
import { useAppointmentAvailability } from "../../hooks/useAppointmentAvailability";

const getErrorMessage = (error, fallbackMessage) => {
  const status = error.response?.status;
  const backendMessage = error.response?.data?.message;

  if (status === 403) {
    return "No tienes permisos para realizar esta acción.";
  }

  if (status === 404) {
    return "Cita no encontrada.";
  }

  return backendMessage || fallbackMessage;
};

function AppointmentBookingPage() {
  const location = useLocation();

  const backLink = location.pathname.startsWith("/admin")
    ? "/admin/citas"
    : "/recepcion/citas";

  const [specialties, setSpecialties] = useState([]);
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [bookingSpecialtyId, setBookingSpecialtyId] = useState("");
  const [bookingPatients, setBookingPatients] = useState([]);
  const [bookingSearch, setBookingSearch] = useState("");
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [bookingPatientId, setBookingPatientId] = useState("");
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [bookingDoctorId, setBookingDoctorId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlot, setBookingSlot] = useState("");
  const [bookingReason, setBookingReason] = useState("");
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [catalogError, setCatalogError] = useState("");

  const {
    doctorSlots: bookingDoctorSlots,
    unionSlots: bookingUnionSlots,
    loadingAvailability,
  } = useAppointmentAvailability({
    serviceId: bookingServiceId,
    date: bookingDate,
    doctors,
    services,
  });

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const data = await getDoctors();

        setDoctors(data);
      } catch (error) {
        console.error("Error al obtener los odontólogos:", error);

        setCatalogError(
          "No fue posible cargar parte de la información para agendar. Revisa la conexión e intenta nuevamente.",
        );
      }
    };

    const loadServices = async () => {
      try {
        const data = await getServices();

        setServices(data);
      } catch (error) {
        console.error("Error al obtener los servicios:", error);

        setCatalogError(
          "No fue posible cargar parte de la información para agendar. Revisa la conexión e intenta nuevamente.",
        );
      }
    };

    const loadBookingPatients = async () => {
      try {
        const data = await getPatients({
          search: "",
          page: 1,
          limit: 50,
        });

        setBookingPatients(data.patients || []);
      } catch (error) {
        console.error("Error al obtener los pacientes:", error);

        setCatalogError(
          "No fue posible cargar parte de la información para agendar. Revisa la conexión e intenta nuevamente.",
        );
      }
    };

    const loadSpecialties = async () => {
      try {
        const data = await getSpecialties();

        setSpecialties(data);
      } catch (error) {
        console.error("Error al obtener las especialidades:", error);

        setCatalogError(
          "No fue posible cargar parte de la información para agendar. Revisa la conexión e intenta nuevamente.",
        );
      }
    };

    loadDoctors();
    loadServices();
    loadSpecialties();
    loadBookingPatients();
  }, []);

  const bookingServices = bookingSpecialtyId
    ? services.filter(
        (service) => service.specialty?._id === bookingSpecialtyId,
      )
    : [];

  const bookingServiceData = services.find(
    (service) => service._id === bookingServiceId,
  );

  const bookingDoctors = bookingServiceData
    ? doctors.filter(
        (doctor) =>
          doctor.specialty?._id === bookingServiceData.specialty?._id,
      )
    : [];

  const bookingAvailableDoctors = bookingDoctors.filter((doctor) =>
    (bookingDoctorSlots[doctor._id] ?? []).includes(bookingSlot),
  );

  const handleSearchBookingPatients = async (event) => {
    event.preventDefault();

    try {
      setSearchingPatients(true);
      setBookingError("");

      const data = await getPatients({
        search: bookingSearch.trim(),
        page: 1,
        limit: 50,
      });

      setBookingPatients(data.patients || []);
      setBookingPatientId("");
    } catch (error) {
      console.error("Error al buscar los pacientes:", error);

      setBookingError(
        getErrorMessage(error, "No fue posible buscar los pacientes."),
      );
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleCreateBooking = async () => {
    if (
      !bookingPatientId ||
      !bookingServiceId ||
      !bookingDoctorId ||
      !bookingDate ||
      !bookingSlot
    ) {
      setBookingError(
        "Selecciona paciente, servicio, odontólogo, fecha y horario.",
      );
      return;
    }

    try {
      setCreatingAppointment(true);
      setBookingError("");
      setBookingSuccess("");

      const dateTime = new Date(
        `${bookingDate}T${bookingSlot}:00-05:00`,
      ).toISOString();

      const data = await createAppointment({
        patientId: bookingPatientId,
        doctor: bookingDoctorId,
        service: bookingServiceId,
        dateTime,
        reason: bookingReason.trim(),
      });

      setBookingSuccess(data.message || "Cita creada correctamente.");

      setBookingPatientId("");
      setBookingServiceId("");
      setBookingDoctorId("");
      setBookingDate("");
      setBookingSlot("");
      setBookingReason("");
    } catch (error) {
      console.error("Error al crear la cita:", error);

      setBookingError(
        getErrorMessage(error, "No fue posible crear la cita."),
      );
    } finally {
      setCreatingAppointment(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            Registro de citas
          </p>

          <h1 className="mt-1 font-title text-3xl font-semibold text-slate-800">
            Agendar cita
          </h1>
        </div>

        <Link
          to={backLink}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Volver a citas
        </Link>
      </div>

      <AppointmentBookingFields
        catalogError={catalogError}
        error={bookingError}
        success={bookingSuccess}
        specialties={specialties}
        specialtyId={bookingSpecialtyId}
        onSpecialtyChange={(value) => {
          setBookingSpecialtyId(value);
          setBookingServiceId("");
          setBookingDoctorId("");
          setBookingSlot("");
        }}
        services={bookingServices}
        serviceId={bookingServiceId}
        onServiceChange={(value) => {
          setBookingServiceId(value);
          setBookingDoctorId("");
          setBookingSlot("");
        }}
        serviceDoctors={bookingDoctors}
        availableDoctors={bookingAvailableDoctors}
        doctorId={bookingDoctorId}
        onDoctorChange={setBookingDoctorId}
        date={bookingDate}
        onDateChange={(value) => {
          setBookingDate(value);
          setBookingDoctorId("");
          setBookingSlot("");
        }}
        slots={bookingUnionSlots}
        selectedSlot={bookingSlot}
        onSlotSelect={(slot) => {
          setBookingSlot(slot);
          setBookingDoctorId("");
        }}
        loadingAvailability={loadingAvailability}
        patients={bookingPatients}
        patientSearch={bookingSearch}
        onPatientSearchChange={setBookingSearch}
        onSearchPatients={handleSearchBookingPatients}
        searchingPatients={searchingPatients}
        patientId={bookingPatientId}
        onPatientIdChange={setBookingPatientId}
        notes={bookingReason}
        onNotesChange={setBookingReason}
        creating={creatingAppointment}
        onSubmit={handleCreateBooking}
      />
    </div>
  );
}

export default AppointmentBookingPage;