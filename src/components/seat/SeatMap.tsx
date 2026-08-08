"use client";

import type { JSX } from "react";

import type { Seat as SeatType } from "@/types";

import { Seat } from "./Seat";
import { SelectionBar } from "./SelectionBar";

interface SeatMapProps {
  seats: readonly SeatType[];
}

const SEAT_PITCH = 14;
const SECTION_WIDTH = 20 * SEAT_PITCH;
const SECTION_HEIGHT = 25 * SEAT_PITCH;
const SECTION_GAP = 40;
const SEAT_AREA_TOP = 40;
const MAP_WIDTH = SECTION_WIDTH * 2 + SECTION_GAP;
const MAP_HEIGHT = SEAT_AREA_TOP + SECTION_HEIGHT * 2 + SECTION_GAP;

function getSeatPosition(seat: SeatType): { x: number; y: number } {
  const sectionIndex = ["A", "B", "C", "D"].indexOf(seat.section);
  const sectionColumn = sectionIndex % 2;
  const sectionRow = Math.floor(sectionIndex / 2);

  return {
    x: sectionColumn * (SECTION_WIDTH + SECTION_GAP) +
      (seat.col - 1) * SEAT_PITCH,
    y: SEAT_AREA_TOP +
      sectionRow * (SECTION_HEIGHT + SECTION_GAP) +
      (seat.row - 1) * SEAT_PITCH,
  };
}

export function SeatMap({ seats }: SeatMapProps): JSX.Element {
  return (
    <div className="space-y-8">
      <svg
        className="h-auto w-full max-w-4xl bg-neutral-950"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      >
        <text
          className="fill-neutral-400 text-sm"
          textAnchor="middle"
          x={MAP_WIDTH / 2}
          y={24}
        >
          STAGE
        </text>

        {seats.map((seat) => {
          const { x, y } = getSeatPosition(seat);

          return <Seat key={seat.id} seat={seat} x={x} y={y} />;
        })}
      </svg>

      <SelectionBar />
    </div>
  );
}
