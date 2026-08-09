import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SNAPSHOT_REFETCH_INTERVAL } from "@/hooks/use-seat-snapshot";

import { OccupancyStats } from "./OccupancyStats";

describe("OccupancyStats", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all four occupancy totals from the admin stats endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        total: 2_000,
        available: 1_995,
        held: 3,
        sold: 2,
        version: 4,
        serverNow: 1_000,
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <OccupancyStats sessionId="session-01" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("2,000")).toBeInTheDocument();
    expect(screen.getByText("1,995")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/stats?sessionId=session-01",
    );

    const query = queryClient.getQueryCache().find({
      queryKey: ["admin-stats", "session-01"],
    });
    expect(query?.options.refetchInterval).toBe(SNAPSHOT_REFETCH_INTERVAL);
  });
});
