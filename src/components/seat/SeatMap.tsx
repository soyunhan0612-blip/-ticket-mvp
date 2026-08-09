"use client";

import type { JSX } from "react";

import { getLayoutBox, getSeatPosition } from "@/lib/seat-layout";
import type { Seat as SeatType } from "@/types";

import { Seat } from "./Seat";
import { SelectionBar } from "./SelectionBar";
import { ZoomPanSvg } from "./ZoomPanSvg";

interface SeatMapProps {
  seats: readonly SeatType[];
  sessionId: string;
  sections: readonly string[];
}

export function SeatMap({
  seats,
  sessionId,
  sections,
}: SeatMapProps): JSX.Element {
  const box = getLayoutBox(sections);

  return (
    <div className="space-y-8">
      <ZoomPanSvg
        box={box}
        className="h-auto w-full max-w-4xl bg-neutral-950"
      >
        <text
          className="fill-neutral-400 text-sm"
          textAnchor="middle"
          x={box.width / 2}
          y={24}
        >
          STAGE
        </text>

        {seats.map((seat) => {
          const { x, y } = getSeatPosition(seat, sections);

          return <Seat key={seat.id} seat={seat} x={x} y={y} />;
        })}
      </ZoomPanSvg>

      <SelectionBar sessionId={sessionId} />
    </div>
  );
}
