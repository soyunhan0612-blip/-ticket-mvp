import { fireEvent, render, screen } from "@testing-library/react";
import { atom, createStore } from "jotai";
import { atomFamily } from "jotai/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  seatMapReadOnlyAtom,
  seatStatusAtomFamily,
  selectedSeatIdsAtom,
  toggleSeatAtom,
} from "@/atoms/seat";
import { Providers } from "@/components/providers";
import { generateSeats } from "@/lib/mock-data";
import {
  createRenderCounter,
  type RenderCounter,
} from "@/lib/render-counter";
import type { SeatVisualState } from "@/types";

import { SeatMap } from "../SeatMap";

const SEAT_COUNT = 200;
const seats = generateSeats().slice(0, SEAT_COUNT);

const { seatRenderProbe } = vi.hoisted(() => ({
  seatRenderProbe: {
    onRender: (_seatId: string): void => undefined,
  },
}));

vi.mock("@/components/seat/Seat", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/seat/Seat")
  >("@/components/seat/Seat");
  const { memo } = await vi.importActual<typeof import("react")>("react");
  const OriginalSeat = actual.Seat.type;

  return {
    ...actual,
    // 원본 Seat의 hook을 이 컴포넌트에서 실행해야 atom 갱신으로 발생한
    // 실제 렌더를 센다. 원본을 바깥 래퍼로 감싸면 memo 경계 밖을 세게 된다.
    Seat: memo(function InstrumentedSeat(
      props: Parameters<typeof OriginalSeat>[0],
    ) {
      seatRenderProbe.onRender(props.seat.id);
      return OriginalSeat(props);
    }),
  };
});

function createInstrumentedVisualStateAtomFamily(counter: RenderCounter) {
  return atomFamily((seatId: string) =>
    atom<SeatVisualState>((get) => {
      counter.bump(seatId);

      // 프로덕션 seatVisualStateAtomFamily와 동일하게 좌석별 서버 상태,
      // 전역 선택 목록, 전역 읽기 전용 상태 세 atom을 모두 구독한다.
      const status = get(seatStatusAtomFamily(seatId));
      const selectedSeatIds = get(selectedSeatIdsAtom);
      const readOnly = get(seatMapReadOnlyAtom);

      if (!readOnly && selectedSeatIds.includes(seatId)) {
        return "selected";
      }

      if (status === null) {
        return "available";
      }

      if (status.s === "held") {
        return !readOnly && status.mine ? "selected" : "held-other";
      }

      if (status.s === "sold") {
        return "sold";
      }

      return "available";
    }),
  );
}

afterEach(() => {
  seatRenderProbe.onRender = () => undefined;
});

describe("현재 SeatMap 렌더 횟수", () => {
  it("좌석 200석에서 클릭 1회당 클릭한 Seat만 리렌더한다", () => {
    const counter = createRenderCounter();
    seatRenderProbe.onRender = (seatId) => counter.bump(seatId);

    // SeatMapContainer가 아닌 SeatMap을 직접 렌더해 3초 폴링을 배제한다.
    // ZoomPanSvg를 포함한 현재 프로덕션 구조 자체는 그대로 측정한다.
    render(
      <Providers>
        <SeatMap
          seats={seats}
          sections={["A"]}
          sessionId="session-01"
        />
      </Providers>,
    );

    const clickedSeat = screen.getByText(seats[0].id).closest("rect");
    if (clickedSeat === null) throw new Error("seat not rendered");

    counter.reset();
    fireEvent.click(clickedSeat);

    expect(counter.total()).toBe(1);
    expect(counter.countOf(seats[0].id)).toBe(1);

    const unrelatedSeat = seats.at(-1);
    if (unrelatedSeat === undefined) throw new Error("unrelated seat missing");
    expect(counter.countOf(unrelatedSeat.id)).toBe(0);
  });

  it("좌석 200석에서 클릭 1회당 파생 atom read를 200회 재계산한다", () => {
    const store = createStore();
    const counter = createRenderCounter();
    const instrumentedVisualStateAtomFamily =
      createInstrumentedVisualStateAtomFamily(counter);
    const unsubscribes = seats.map((seat) =>
      store.sub(instrumentedVisualStateAtomFamily(seat.id), () => undefined),
    );

    // 초기 구독 평가를 제외하고 선택 atom 변경으로 발생한 read 진입만 센다.
    counter.reset();
    store.set(toggleSeatAtom, seats[0].id);

    expect(counter.total()).toBe(seats.length);
    expect(counter.countOf(seats[0].id)).toBe(1);

    const unrelatedSeat = seats.at(-1);
    if (unrelatedSeat === undefined) throw new Error("unrelated seat missing");
    expect(counter.countOf(unrelatedSeat.id)).toBe(1);

    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  });
});
