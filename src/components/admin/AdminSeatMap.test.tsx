import { Provider, createStore } from "jotai";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { seatMapReadOnlyAtom } from "@/atoms/seat";
import type { Seat } from "@/types";

import { AdminSeatMap } from "./AdminSeatMap";

vi.mock("@/hooks/use-seat-snapshot", () => ({
  useSeatSnapshot: vi.fn(),
}));

vi.mock("@/components/seat/SeatMap", () => ({
  SeatMap: (props: {
    seats: readonly unknown[];
    sections: readonly string[];
    readOnly?: boolean;
  }) => (
    <div
      data-readonly={String(props.readOnly)}
      data-seat-count={props.seats.length}
      data-sections={props.sections.join(",")}
      data-testid="shared-seat-map"
    />
  ),
}));

const SEATS: readonly Seat[] = [
  { id: "A-1-1", section: "A", row: 1, col: 1 },
  { id: "A-1-2", section: "A", row: 1, col: 2 },
];

describe("AdminSeatMap", () => {
  it("enables read-only mode only while the admin map is mounted", () => {
    const store = createStore();
    const { unmount } = render(
      <Provider store={store}>
        <AdminSeatMap seats={SEATS} sections={["A"]} sessionId="session-01" />
      </Provider>,
    );

    expect(screen.getByTestId("shared-seat-map")).toBeInTheDocument();
    expect(store.get(seatMapReadOnlyAtom)).toBe(true);

    unmount();
    expect(store.get(seatMapReadOnlyAtom)).toBe(false);
  });

  it("passes the given seats and sections through to the shared seat map", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <AdminSeatMap seats={SEATS} sections={["A"]} sessionId="session-01" />
      </Provider>,
    );

    const seatMap = screen.getByTestId("shared-seat-map");
    expect(seatMap).toHaveAttribute("data-sections", "A");
    expect(seatMap).toHaveAttribute("data-seat-count", "2");
    expect(seatMap).toHaveAttribute("data-readonly", "true");
  });
});
