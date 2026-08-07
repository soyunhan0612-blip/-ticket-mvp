"use client";

// 의도적 안티패턴: Day 4에서 atomFamily + memo로 리팩토링. before/after 서사의 대조군.
import { useState, type JSX } from "react";

import { canSelect, MAX_SEATS_PER_HOLD } from "@/lib/seat-rules";
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
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(seatId: string): void {
    if (selected.includes(seatId)) {
      setSelected(selected.filter((selectedId) => selectedId !== seatId));
      return;
    }

    if (
      selected.length < MAX_SEATS_PER_HOLD &&
      canSelect(selected, seatId)
    ) {
      setSelected([...selected, seatId]);
    }
  }

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
          const isSelected = selected.includes(seat.id);
          const { x, y } = getSeatPosition(seat);

          return (
            <Seat
              key={seat.id}
              onClick={() => toggle(seat.id)}
              seat={seat}
              state={isSelected ? "selected" : "available"}
              x={x}
              y={y}
            />
          );
        })}
      </svg>

      {selected.length > 0 ? (
        <SelectionBar
          onClear={() => setSelected([])}
          selected={selected}
        />
      ) : null}
    </div>
  );
}
