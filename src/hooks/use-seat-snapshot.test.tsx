import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { Provider as JotaiProvider, createStore } from "jotai";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { seatStatusAtomFamily, serverNowAtom } from "@/atoms/seat";
import type { SeatSnapshot } from "@/types";

import { SNAPSHOT_QUERY_KEY, useSeatSnapshot } from "./use-seat-snapshot";

function snapshotFor(sessionId: string): SeatSnapshot {
  if (sessionId === "session-A") {
    return { version: 0, serverNow: 1_000, seats: { "A-1-1": { s: "sold" } } };
  }

  return { version: 0, serverNow: 2_000, seats: { "B-2-2": { s: "sold" } } };
}

function setup() {
  const store = createStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <JotaiProvider store={store}>{children}</JotaiProvider>
      </QueryClientProvider>
    );
  }

  return { queryClient, store, wrapper };
}

describe("useSeatSnapshot", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resyncs when sessionId changes even if the snapshot version is unchanged", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const sessionId = String(input).includes("session-A")
        ? "session-A"
        : "session-B";

      return Promise.resolve(Response.json(snapshotFor(sessionId)));
    });
    const { queryClient, store, wrapper } = setup();
    // Prime session B so the switch swaps straight from A's data to B's, with
    // no undefined gap that would re-fire the effect on its own.
    queryClient.setQueryData(
      [SNAPSHOT_QUERY_KEY, "session-B"],
      snapshotFor("session-B"),
    );

    const { rerender } = renderHook(
      ({ sessionId }: { sessionId: string }) => useSeatSnapshot(sessionId),
      { initialProps: { sessionId: "session-A" }, wrapper },
    );

    await waitFor(() => {
      expect(store.get(seatStatusAtomFamily("A-1-1"))).toEqual({ s: "sold" });
    });

    // Both sessions report version 0, so only the sessionId distinguishes them.
    rerender({ sessionId: "session-B" });

    await waitFor(() => {
      expect(store.get(seatStatusAtomFamily("B-2-2"))).toEqual({ s: "sold" });
    });
    expect(store.get(seatStatusAtomFamily("A-1-1"))).toBeNull();
  });

  it("does not resync on a poll that only advances serverNow", async () => {
    let serverNow = 1_000;
    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      serverNow += 1_000;

      return Promise.resolve(
        Response.json({
          version: 7,
          serverNow,
          seats: { "A-1-1": { s: "sold" } },
        } satisfies SeatSnapshot),
      );
    });
    const { store, wrapper } = setup();
    // Count writes at the store level: a same-version poll must not even reach
    // the setter, which is what keeps 2,000 seat atoms from being rewritten
    // every 3 seconds.
    const syncSpy = vi.spyOn(store, "set");

    const { result } = renderHook(() => useSeatSnapshot("session-A"), {
      wrapper,
    });

    await waitFor(() => {
      expect(store.get(serverNowAtom)).toBe(2_000);
    });
    const callsAfterFirstSync = syncSpy.mock.calls.length;

    await result.current.refetch();
    await waitFor(() => {
      expect(result.current.data?.serverNow).toBe(3_000);
    });

    // The version is unchanged, so serverNow stays at the first synced value
    // and no further atom writes happen.
    expect(store.get(serverNowAtom)).toBe(2_000);
    expect(syncSpy.mock.calls.length).toBe(callsAfterFirstSync);
  });
});
