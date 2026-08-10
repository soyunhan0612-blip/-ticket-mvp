"use client";

import { cardClassName } from "@/components/ui/Card";
import { SEAT_PRESETS, type SeatPresetId } from "@/lib/seat-preset";

interface SeatPresetSelectorProps {
  value: SeatPresetId | null;
  onChange: (id: SeatPresetId) => void;
}

export function SeatPresetSelector({
  value,
  onChange,
}: SeatPresetSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-lg sm:grid-cols-3">
      {SEAT_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          aria-pressed={value === preset.id}
          className={cardClassName({
            interactive: true,
            className: `text-left ${value === preset.id ? "border-primary ring-1 ring-primary" : ""}`,
          })}
          onClick={() => onChange(preset.id)}
        >
          <p className="text-body-sm font-bold text-ink">{preset.label}</p>
          <p className="mt-xs text-body-sm text-body-aa">
            {preset.sections.length}개 구역 ·{" "}
            {preset.totalSeats.toLocaleString()}석
          </p>
        </button>
      ))}
    </div>
  );
}
