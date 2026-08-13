/*
 * Day 3(before) 대조군 재현. 출처 커밋: 91713d0
 * "feat(2-seat-v0): step 1 — seat-components".
 * 재현 범위: memo 부재, state·onClick prop drilling, SeatMap의 useState 선택 상태,
 * 렌더 중 selected.includes() 판정.
 * 재현하지 않은 것: 당시의 Tailwind 기본 팔레트 클래스명(현재는 DS 토큰),
 * ZoomPanSvg 부재. 이 둘은 렌더 횟수에 영향을 주지 않는다.
 * 이 파일은 테스트 전용이다. 프로덕션 코드에서 import하지 마라.
 */
"use client";

import { createContext, type JSX, useContext, useState } from "react";

import { getLayoutBox, getSeatPosition } from "@/lib/seat-layout";
import { canSelect, MAX_SEATS_PER_HOLD } from "@/lib/seat-rules";
import type { Seat as SeatType, SeatVisualState } from "@/types";

const SeatRenderContext = createContext<
  ((seatId: string) => void) | undefined
>(undefined);

const STATE_CLASS_NAMES: Record<SeatVisualState, string> = {
  available: "fill-seat-available cursor-pointer hover:fill-seat-available-hover",
  selected: "fill-seat-mine cursor-pointer",
  "held-other": "fill-seat-other cursor-not-allowed",
  sold: "fill-seat-sold cursor-not-allowed",
};

export interface NaiveSeatProps {
  seat: SeatType;
  x: number;
  y: number;
  state: SeatVisualState;
  onClick: () => void;
}

/** memo 없음 — Day 3 대조군. */
export function NaiveSeat({
  seat,
  x,
  y,
  state,
  onClick,
}: NaiveSeatProps): JSX.Element {
  const onSeatRender = useContext(SeatRenderContext);
  onSeatRender?.(seat.id);

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

export interface NaiveSeatMapProps {
  seats: readonly SeatType[];
  sections: readonly string[];
  /** 렌더될 때마다 호출된다. 렌더 횟수 계측용 주입 지점. */
  onSeatRender?: (seatId: string) => void;
}

/** 선택 상태를 useState로 보유 — Day 3 대조군. */
export function NaiveSeatMap({
  seats,
  sections,
  onSeatRender,
}: NaiveSeatMapProps): JSX.Element {
  const [selected, setSelected] = useState<string[]>([]);
  const box = getLayoutBox(sections);

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
    <SeatRenderContext.Provider value={onSeatRender}>
      <svg
        className="h-auto w-full max-w-4xl rounded-card bg-ink-deep"
        viewBox={`0 0 ${box.width} ${box.height}`}
      >
        <text
          className="fill-mute text-caption"
          textAnchor="middle"
          x={box.width / 2}
          y={24}
        >
          STAGE
        </text>

        {seats.map((seat) => {
          const isSelected = selected.includes(seat.id);
          const { x, y } = getSeatPosition(seat, sections);

          return (
            <NaiveSeat
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
    </SeatRenderContext.Provider>
  );
}
