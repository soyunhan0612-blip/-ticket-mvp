import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { generateSeats } from "@/lib/mock-data";
import { createRenderCounter } from "@/lib/render-counter";

import { NaiveSeatMap } from "../__fixtures__/naive-seat-map";

const SEAT_COUNT = 200;
const seats = generateSeats().slice(0, SEAT_COUNT);

describe("Day 3 NaiveSeatMap 렌더 횟수", () => {
  it("좌석 200석에서 클릭 1회당 전체 좌석이 리렌더된다", () => {
    const counter = createRenderCounter();

    render(
      <NaiveSeatMap
        onSeatRender={(seatId) => counter.bump(seatId)}
        seats={seats}
        sections={["A"]}
      />,
    );

    const clickedSeat = screen.getByText(seats[0].id).closest("rect");
    if (clickedSeat === null) throw new Error("seat not rendered");

    // 초기 마운트 비용은 별도 측정 대상이다. 여기서는 클릭으로 발생한
    // 업데이트 렌더만 세기 위해 마운트 직후 카운터를 비운다.
    counter.reset();
    fireEvent.click(clickedSeat);

    // jsdom에서 2,000개 SVG 노드를 렌더하지 않고 200석으로 비례 관계를
    // 검증한다. 클릭당 렌더 수가 전체 좌석 수와 같으므로 2,000석에서도
    // 같은 구조라면 2,000회가 된다.
    expect(counter.total()).toBe(seats.length);
    expect(counter.countOf(seats[0].id)).toBe(1);

    const unrelatedSeat = seats.at(-1);
    if (unrelatedSeat === undefined) throw new Error("unrelated seat missing");
    expect(counter.countOf(unrelatedSeat.id)).toBe(1);
  });
});
