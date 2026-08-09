"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { memo, type JSX } from "react";

import {
  seatMapReadOnlyAtom,
  seatVisualStateAtomFamily,
  toggleSeatAtom,
} from "@/atoms/seat";
import type { Seat as SeatType, SeatVisualState } from "@/types";

interface SeatProps {
  seat: SeatType;
  x: number;
  y: number;
}

const STATE_CLASS_NAMES: Record<SeatVisualState, string> = {
  available: "fill-neutral-500 cursor-pointer hover:fill-neutral-400",
  selected: "fill-white cursor-pointer",
  "held-other": "fill-neutral-700 cursor-not-allowed",
  sold: "fill-neutral-800 cursor-not-allowed",
};

export const Seat = memo(function Seat({ seat, x, y }: SeatProps): JSX.Element {
  const state = useAtomValue(seatVisualStateAtomFamily(seat.id));
  const readOnly = useAtomValue(seatMapReadOnlyAtom);
  const toggle = useSetAtom(toggleSeatAtom);
  const isInteractive =
    !readOnly && (state === "available" || state === "selected");

  return (
    <rect
      className={STATE_CLASS_NAMES[state]}
      height={12}
      onClick={isInteractive ? () => toggle(seat.id) : undefined}
      pointerEvents={isInteractive ? "auto" : "none"}
      rx={2}
      width={12}
      x={x}
      y={y}
    >
      <title>{seat.id}</title>
    </rect>
  );
});
