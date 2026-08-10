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

// 모노크롬 4단계. 값은 docs/UI_GUIDE.md 좌석 시각 규칙과 globals.css --seat-* 토큰.
// ink-deep 캔버스 위에서 명도로만 구분한다 — 색을 추가하지 않는다.
const STATE_CLASS_NAMES: Record<SeatVisualState, string> = {
  available: "fill-seat-available cursor-pointer hover:fill-seat-available-hover",
  selected: "fill-seat-mine cursor-pointer",
  "held-other": "fill-seat-other cursor-not-allowed",
  sold: "fill-seat-sold cursor-not-allowed",
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
