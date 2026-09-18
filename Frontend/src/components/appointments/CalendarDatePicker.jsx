import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const fromDateKey = (value) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const getBogotaTodayKey = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (type) =>
    parts.find((part) => part.type === type).value;

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

function CalendarDatePicker({
  value,
  onChange,
  disabled = false,
  minDate,
  disableWeekends = true,
}) {
  const selectedDate = value ? fromDateKey(value) : undefined;

  const effectiveMinDate = minDate || getBogotaTodayKey();

  const handleSelect = (date) => {
    onChange(date ? toDateKey(date) : "");
  };

  const isDisabled = (date) => {
    if (disabled) {
      return true;
    }

    if (
      disableWeekends &&
      (date.getDay() === 0 || date.getDay() === 6)
    ) {
      return true;
    }

    const candidate = fromDateKey(toDateKey(date));

    if (candidate < fromDateKey(effectiveMinDate)) {
      return true;
    }

    return false;
  };

  return (
    <DayPicker
      mode="single"
      selected={selectedDate}
      onSelect={handleSelect}
      disabled={isDisabled}
      locale={es}
      required
    />
  );
}

export default CalendarDatePicker;