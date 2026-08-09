import { Provider, createStore } from "jotai";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { seatMapReadOnlyAtom } from "@/atoms/seat";

import { AdminSeatMap } from "./AdminSeatMap";

vi.mock("@/hooks/use-seat-snapshot", () => ({
  useSeatSnapshot: vi.fn(),
}));

vi.mock("@/components/seat/SeatMap", () => ({
  SeatMap: () => <div data-testid="shared-seat-map" />,
}));

describe("AdminSeatMap", () => {
  it("enables read-only mode only while the admin map is mounted", () => {
    const store = createStore();
    const { unmount } = render(
      <Provider store={store}>
        <AdminSeatMap presetId="small" sessionId="session-01" />
      </Provider>,
    );

    expect(screen.getByTestId("shared-seat-map")).toBeInTheDocument();
    expect(store.get(seatMapReadOnlyAtom)).toBe(true);

    unmount();
    expect(store.get(seatMapReadOnlyAtom)).toBe(false);
  });
});
