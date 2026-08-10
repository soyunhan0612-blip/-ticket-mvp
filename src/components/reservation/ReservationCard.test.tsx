import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReservationCard } from "./ReservationCard";

const cancelMutation = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn(),
}));

vi.mock("@/hooks/use-cancel-reservation", () => ({
  useCancelReservation: () => cancelMutation,
}));

describe("ReservationCard", () => {
  it("작은 화면에서는 내용과 액션을 세로로 쌓는다", () => {
    const { container } = render(
      <ReservationCard
        createdAt={Date.UTC(2026, 7, 10, 10, 30)}
        id="reservation-1234"
        seatIds={["A-1-1", "A-1-2"]}
        sessionId="session-1"
        status="confirmed"
      />,
    );

    const card = container.firstElementChild;
    const layout = card?.firstElementChild;
    const actions = layout?.lastElementChild;

    expect(layout).toHaveClass("flex-col", "sm:flex-row");
    expect(actions).toHaveClass(
      "w-full",
      "flex-row",
      "items-center",
      "sm:w-auto",
      "sm:flex-col",
      "sm:items-end",
    );
    expect(screen.getByRole("link", { name: "좌석 보기" })).toHaveAttribute(
      "href",
      "/sessions/session-1/seats",
    );
  });
});
