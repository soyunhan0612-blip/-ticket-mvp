"use client";

import Image from "next/image";

import { cardClassName } from "@/components/ui/Card";
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
    <div className="grid grid-cols-1 gap-lg sm:grid-cols-3">
      {POSTER_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          aria-pressed={value === preset.id}
          className={cardClassName({
            interactive: true,
            className: `p-lg text-left ${value === preset.id ? "border-primary ring-1 ring-primary" : ""}`,
          })}
          onClick={() => onChange(preset.id)}
        >
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[120px] overflow-hidden rounded-card">
            <Image
              src={preset.url}
              alt={preset.label}
              fill
              className="object-contain"
            />
          </div>
          <p className="mt-md text-center text-body-sm font-bold text-ink">
            {preset.label}
          </p>
        </button>
      ))}
    </div>
  );
}
