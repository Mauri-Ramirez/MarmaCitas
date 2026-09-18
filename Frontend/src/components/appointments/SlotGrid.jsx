function SlotGrid({
  slots,
  selectedSlot,
  onSelect,
  disabled = false,
  emptyMessage = "No hay horarios disponibles.",
}) {
  if (slots.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => {
        const isSelected = selectedSlot === slot;

        return (
          <button
            key={slot}
            type="button"
            onClick={() => onSelect(slot)}
            disabled={disabled}
            aria-pressed={isSelected}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
              isSelected
                ? "bg-primary text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
            }`}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}

export default SlotGrid;