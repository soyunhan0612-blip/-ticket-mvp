"use client";

import Image from "next/image";
import type { JSX } from "react";

import { POSTER_PRESETS } from "@/lib/poster-preset";

interface PosterPresetSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PosterPresetSelector({
  value,
  onChange,
}: PosterPresetSelectorProps): JSX.Element {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-white">포스터</legend>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {POSTER_PRESETS.map((preset) => (
          <label
            className={`cursor-pointer rounded-lg border bg-neutral-900 p-4 transition-colors duration-150 ${
              value === preset.id ? "border-white" : "border-neutral-800"
            }`}
            key={preset.id}
          >
            <input
              checked={value === preset.id}
              className="sr-only"
              name="posterPreset"
              onChange={() => onChange(preset.id)}
              type="radio"
              value={preset.id}
            />
            <Image
              alt={`${preset.label} 포스터`}
              className="h-auto w-full rounded-md"
              height={600}
              src={preset.url}
              width={400}
            />
            <span className="mt-3 block text-sm font-medium text-white">
              {preset.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
