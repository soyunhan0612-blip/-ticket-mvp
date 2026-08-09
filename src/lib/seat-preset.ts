import {
  COLS_PER_ROW,
  ROWS_PER_SECTION,
  toSeatId,
  type Section,
} from "@/lib/seat-map";
import type { Seat, Session } from "@/types";

export type SeatPresetId = "small" | "medium" | "large";

export interface SeatPreset {
  id: SeatPresetId;
  label: string;
  sections: Section[];
  totalSeats: number;
}

export const SEAT_PRESETS: readonly SeatPreset[] = [
  {
    id: "small",
    label: "소규모 (500석)",
    sections: ["A"],
    totalSeats: 500,
  },
  {
    id: "medium",
    label: "중규모 (1,000석)",
    sections: ["A", "B"],
    totalSeats: 1_000,
  },
  {
    id: "large",
    label: "대규모 (2,000석)",
    sections: ["A", "B", "C", "D"],
    totalSeats: 2_000,
  },
];

export function isValidPresetId(id: string): id is SeatPresetId {
  return SEAT_PRESETS.some((preset) => preset.id === id);
}

export function getPreset(id: SeatPresetId): SeatPreset {
  const preset = SEAT_PRESETS.find((candidate) => candidate.id === id);

  if (!preset) {
    throw new RangeError(`Unknown seat preset: ${id}`);
  }

  return preset;
}

export function generateSeatsForPreset(presetId: SeatPresetId): Seat[] {
  const seats: Seat[] = [];

  for (const section of getPreset(presetId).sections) {
    for (let row = 1; row <= ROWS_PER_SECTION; row += 1) {
      for (let col = 1; col <= COLS_PER_ROW; col += 1) {
        seats.push({
          id: toSeatId(section, row, col),
          section,
          row,
          col,
        });
      }
    }
  }

  return seats;
}

export function generateSessionsForShow(
  showId: string,
  startsAtList: string[],
): Session[] {
  return startsAtList.map((startsAt) => ({
    id: crypto.randomUUID(),
    showId,
    startsAt,
  }));
}
