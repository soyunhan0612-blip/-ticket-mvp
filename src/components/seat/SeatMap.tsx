"use client";

import { type JSX, useMemo } from "react";

import { getLayoutBox, getSeatPosition } from "@/lib/seat-layout";
import type { Seat as SeatType } from "@/types";

import { Seat } from "./Seat";
import { SelectionBar } from "./SelectionBar";
import { ZoomPanSvg } from "./ZoomPanSvg";

interface SeatMapProps {
  seats: readonly SeatType[];
  sessionId: string;
  sections: readonly string[];
  readOnly?: boolean;
}

export function SeatMap({
  seats,
  sessionId,
  sections,
  readOnly = false,
}: SeatMapProps): JSX.Element {
  // 3초 폴링마다 컨테이너가 리렌더된다. 매번 새 객체를 넘기면 ZoomPanSvg의
  // wheel·드래그 리스너가 그때마다 해제·재등록된다.
  const box = useMemo(() => getLayoutBox(sections), [sections]);

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

      {!readOnly && <SelectionBar sessionId={sessionId} />}
    </div>
  );
}
