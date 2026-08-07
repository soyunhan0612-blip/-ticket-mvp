// 의도적 안티패턴: Day 4에서 memo로 리팩토링할 before 대조군.
import type { JSX } from "react";

import type { Seat as SeatType } from "@/types";

export type SeatVisualState =
  | "available"
  | "selected"
  | "held-other"
  | "sold";

interface SeatProps {
  seat: SeatType;
  x: number;
  y: number;
  state: SeatVisualState;
  onClick: () => void;
}

const STATE_CLASS_NAMES: Record<SeatVisualState, string> = {
  available: "fill-neutral-500 cursor-pointer hover:fill-neutral-400",
  selected: "fill-white cursor-pointer",
  "held-other": "fill-neutral-700 cursor-not-allowed",
  sold: "fill-neutral-800 cursor-not-allowed",
};

export function Seat({
  seat,
  x,
  y,
  state,
  onClick,
}: SeatProps): JSX.Element {
  const isInteractive = state === "available" || state === "selected";

  return (
    <rect
      className={STATE_CLASS_NAMES[state]}
      height={12}
      onClick={isInteractive ? onClick : undefined}
      pointerEvents={isInteractive ? "auto" : "none"}
      rx={2}
      width={12}
      x={x}
      y={y}
    >
      <title>{seat.id}</title>
    </rect>
  );
}
