"use client";

import type { JSX } from "react";

import { SEAT_PRESETS, type SeatPresetId } from "@/lib/seat-preset";

interface SeatPresetSelectorProps {
  value: SeatPresetId;
  onChange: (value: SeatPresetId) => void;
}

export function SeatPresetSelector({
  value,
  onChange,
}: SeatPresetSelectorProps): JSX.Element {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-white">좌석 프리셋</legend>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {SEAT_PRESETS.map((preset) => (
          <label
            className={`cursor-pointer rounded-lg border bg-neutral-900 p-6 transition-colors duration-150 ${
              value === preset.id ? "border-white" : "border-neutral-800"
            }`}
            key={preset.id}
          >
            <input
              checked={value === preset.id}
              className="sr-only"
              name="seatPreset"
              onChange={() => onChange(preset.id)}
              type="radio"
              value={preset.id}
            />
            <span className="block text-lg font-semibold text-white">
              {preset.label}
            </span>
            <span className="mt-2 block text-sm text-neutral-400">
              총 {preset.totalSeats.toLocaleString("ko-KR")}석
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
