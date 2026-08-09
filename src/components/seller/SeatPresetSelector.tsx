"use client";

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {SEAT_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`rounded-lg border p-6 text-left transition-colors duration-150 ${
            value === preset.id
              ? "border-white bg-neutral-900"
              : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
          }`}
          onClick={() => onChange(preset.id)}
        >
          <p className="text-sm font-semibold text-white">{preset.label}</p>
          <p className="mt-1 text-sm text-neutral-400">
            {preset.sections.length}개 구역 ·{" "}
            {preset.totalSeats.toLocaleString()}석
          </p>
        </button>
      ))}
    </div>
  );
}
