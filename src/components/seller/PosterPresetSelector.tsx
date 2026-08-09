"use client";

import Image from "next/image";

import { POSTER_PRESETS } from "@/lib/poster-preset";

interface PosterPresetSelectorProps {
  value: string | null;
  onChange: (id: string) => void;
}

export function PosterPresetSelector({
  value,
  onChange,
}: PosterPresetSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {POSTER_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`rounded-lg border p-4 text-left transition-colors duration-150 ${
            value === preset.id
              ? "border-white bg-neutral-900"
              : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
          }`}
          onClick={() => onChange(preset.id)}
        >
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[120px]">
            <Image
              src={preset.url}
              alt={preset.label}
              fill
              className="object-contain"
            />
          </div>
          <p className="mt-3 text-center text-sm font-medium text-white">
            {preset.label}
          </p>
        </button>
      ))}
    </div>
  );
}
