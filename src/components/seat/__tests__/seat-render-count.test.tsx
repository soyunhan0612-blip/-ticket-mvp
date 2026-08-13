import { fireEvent, render, screen } from "@testing-library/react";
import { atom, createStore } from "jotai";
import { atomFamily } from "jotai/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  seatMapReadOnlyAtom,
  seatStatusAtomFamily,
  seatVisualStateAtomFamily,
  selectedSeatIdsAtom,
  toggleSeatAtom,
} from "@/atoms/seat";
import { Providers } from "@/components/providers";
import { generateSeats } from "@/lib/mock-data";
import {
  createRenderCounter,
  type RenderCounter,
} from "@/lib/render-counter";
import type { SeatSnapshotEntry, SeatVisualState } from "@/types";

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

  // Jotai에는 파생 atom의 재계산 횟수를 세는 공개 API가 없어 위 테스트는 프로덕션
  // seatVisualStateAtomFamily를 복제한 atom을 계측한다. 복제본이 프로덕션과 갈라지면
  // 200회라는 수치는 근거를 잃고 README·PROGRESS의 기록이 조용히 거짓이 되므로,
  // 두 atom이 같은 입력에 같은 값을 내는지를 여기서 강제한다.
  //
  // 한계: 이 테스트는 판정 로직의 드리프트를 잡지만 의존 atom 집합의 변화는 잡지
  // 못한다. 프로덕션이 selectedSeatIdsAtom 전체 구독을 좁히면 값은 그대로여서 이
  // 테스트는 통과하는데 실제 재계산 수는 200보다 작아진다. 그 변경을 할 때는 위
  // 복제본과 README·PROGRESS의 수치를 함께 갱신해야 한다.
  it("계측용 복제 atom은 프로덕션 seatVisualStateAtomFamily와 항상 같은 값을 낸다", () => {
    const instrumentedVisualStateAtomFamily =
      createInstrumentedVisualStateAtomFamily(createRenderCounter());
    const seatId = seats[0].id;
    const statuses: (SeatSnapshotEntry | null)[] = [
      null,
      { s: "held", mine: true, expiresAt: 1 },
      { s: "held" },
      { s: "sold" },
    ];

    for (const status of statuses) {
      for (const selected of [true, false]) {
        for (const readOnly of [true, false]) {
          const store = createStore();
          store.set(seatStatusAtomFamily(seatId), status);
          store.set(selectedSeatIdsAtom, selected ? [seatId] : []);
          store.set(seatMapReadOnlyAtom, readOnly);

          expect(store.get(instrumentedVisualStateAtomFamily(seatId))).toBe(
            store.get(seatVisualStateAtomFamily(seatId)),
          );
        }
      }
    }
  });
});
