import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import type { SeatSnapshot } from "@/types";

import {
  conflictSeatIdsAtom,
  myHoldExpiresAtAtom,
  seatMapReadOnlyAtom,
  seatStatusAtomFamily,
  seatVisualStateAtomFamily,
  selectedSeatIdsAtom,
  serverNowAtom,
  snapshotVersionAtom,
  syncSnapshotAtom,
  toggleSeatAtom,
  trackedSeatIdsAtom,
} from "./seat";

type Store = ReturnType<typeof createStore>;

function sync(
  store: Store,
  snapshot: SeatSnapshot,
  sessionId = "session-01",
): void {
  store.set(syncSnapshotAtom, { sessionId, snapshot });
}

describe("conflictSeatIdsAtom", () => {
  it("starts empty", () => {
    const store = createStore();

    expect(store.get(conflictSeatIdsAtom)).toEqual([]);
  });

  it("returns the configured seat ids", () => {
    const store = createStore();

    store.set(conflictSeatIdsAtom, ["A-1-1", "A-1-2"]);

    expect(store.get(conflictSeatIdsAtom)).toEqual(["A-1-1", "A-1-2"]);
  });
});

describe("syncSnapshotAtom", () => {
  it("updates version and serverNow for an empty snapshot", () => {
    const store = createStore();

    sync(store, { version: 1, serverNow: 1_000, seats: {} });

    expect(store.get(snapshotVersionAtom)).toBe(1);
    expect(store.get(serverNowAtom)).toBe(1_000);
  });

  it("syncs a held seat to seatStatusAtomFamily", () => {
    const store = createStore();

    sync(store, {
      version: 1,
      serverNow: 1_000,
      seats: {
        "A-1-1": { s: "held", mine: false, expiresAt: 2_000 },
      },
    });

    expect(store.get(seatStatusAtomFamily("A-1-1"))).toEqual({
      s: "held",
      mine: false,
      expiresAt: 2_000,
    });
  });

  it("does not update atoms for a same-version snapshot in the same session", () => {
    const store = createStore();
    sync(store, {
      version: 1,
      serverNow: 1_000,
      seats: { "A-1-1": { s: "sold" } },
    });

    sync(store, {
      version: 1,
      serverNow: 2_000,
      seats: { "A-1-1": { s: "held", mine: true, expiresAt: 3_000 } },
    });

    expect(store.get(serverNowAtom)).toBe(1_000);
    expect(store.get(seatStatusAtomFamily("A-1-1"))).toEqual({ s: "sold" });
    expect(store.get(myHoldExpiresAtAtom)).toBeNull();
  });

  it("fully resyncs when the session changes even at the same version", () => {
    const store = createStore();
    sync(
      store,
      { version: 0, serverNow: 1_000, seats: { "A-1-1": { s: "sold" } } },
      "session-A",
    );

    sync(
      store,
      { version: 0, serverNow: 2_000, seats: { "B-2-2": { s: "sold" } } },
      "session-B",
    );

    expect(store.get(seatStatusAtomFamily("A-1-1"))).toBeNull();
    expect(store.get(seatStatusAtomFamily("B-2-2"))).toEqual({ s: "sold" });
    expect(store.get(serverNowAtom)).toBe(2_000);
    expect(store.get(trackedSeatIdsAtom)).toEqual(new Set(["B-2-2"]));
  });

  it("clears a previous session's hold expiry when switching sessions", () => {
    const store = createStore();
    sync(
      store,
      {
        version: 0,
        serverNow: 1_000,
        seats: { "A-1-1": { s: "held", mine: true, expiresAt: 9_000 } },
      },
      "session-A",
    );
    expect(store.get(myHoldExpiresAtAtom)).toBe(9_000);

    sync(store, { version: 0, serverNow: 2_000, seats: {} }, "session-B");

    expect(store.get(myHoldExpiresAtAtom)).toBeNull();
  });

  it("clears the previous session's selection when switching sessions", () => {
    const store = createStore();
    sync(store, { version: 0, serverNow: 1_000, seats: {} }, "session-A");
    store.set(selectedSeatIdsAtom, ["A-1-1"]);
    store.set(conflictSeatIdsAtom, ["A-1-2"]);

    sync(store, { version: 0, serverNow: 2_000, seats: {} }, "session-B");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
    expect(store.get(conflictSeatIdsAtom)).toEqual([]);
  });

  it("applies a first snapshot that legitimately reports version 0", () => {
    const store = createStore();

    sync(
      store,
      { version: 0, serverNow: 1_234, seats: { "A-1-1": { s: "sold" } } },
      "session-A",
    );

    expect(store.get(serverNowAtom)).toBe(1_234);
    expect(store.get(seatStatusAtomFamily("A-1-1"))).toEqual({ s: "sold" });
  });

  it("restores a seat omitted from the new snapshot to available", () => {
    const store = createStore();
    sync(store, {
      version: 1,
      serverNow: 1_000,
      seats: { "A-1-1": { s: "sold" } },
    });

    sync(store, { version: 2, serverNow: 2_000, seats: {} });

    expect(store.get(seatStatusAtomFamily("A-1-1"))).toBeNull();
  });

  it("tracks expiresAt for a held seat owned by the current user", () => {
    const store = createStore();

    sync(store, {
      version: 1,
      serverNow: 1_000,
      seats: {
        "A-1-1": { s: "held", mine: true, expiresAt: 2_000 },
      },
    });

    expect(store.get(myHoldExpiresAtAtom)).toBe(2_000);
  });

  it("does not track expiresAt for a held seat owned by another user", () => {
    const store = createStore();

    sync(store, {
      version: 1,
      serverNow: 1_000,
      seats: {
        "A-1-1": { s: "held", mine: false, expiresAt: 2_000 },
      },
    });

    expect(store.get(myHoldExpiresAtAtom)).toBeNull();
  });
});

describe("myHoldExpiresAtAtom", () => {
  it("starts with null", () => {
    const store = createStore();

    expect(store.get(myHoldExpiresAtAtom)).toBeNull();
  });
});

describe("selectedSeatIdsAtom", () => {
  it("starts empty and reflects seats added through toggleSeatAtom", () => {
    const store = createStore();

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual(["A-1-1"]);
  });
});

describe("toggleSeatAtom", () => {
  it("does nothing while the seat map is read-only", () => {
    const store = createStore();
    store.set(seatMapReadOnlyAtom, true);

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
  });

  it("adds a valid seat", () => {
    const store = createStore();

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual(["A-1-1"]);
  });

  it("removes an already selected seat", () => {
    const store = createStore();
    store.set(selectedSeatIdsAtom, ["A-1-1"]);

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
  });

  it("ignores a fifth seat when four seats are selected", () => {
    const store = createStore();
    store.set(selectedSeatIdsAtom, ["A-1-1", "A-1-2", "A-1-3", "A-1-4"]);

    store.set(toggleSeatAtom, "A-1-5");

    expect(store.get(selectedSeatIdsAtom)).toEqual([
      "A-1-1",
      "A-1-2",
      "A-1-3",
      "A-1-4",
    ]);
  });

  it("ignores an invalid seat id", () => {
    const store = createStore();

    store.set(toggleSeatAtom, "Z-99-99");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
  });

  it("ignores a seat held by another user", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "held", mine: false });

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
  });

  it("ignores a sold seat", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "sold" });

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
  });

  it("allows toggling a seat held by the current user", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "held", mine: true });

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual(["A-1-1"]);
  });
});

describe("seatVisualStateAtomFamily", () => {
  it("ignores local selection while the seat map is read-only", () => {
    const store = createStore();
    store.set(selectedSeatIdsAtom, ["A-1-1"]);
    store.set(seatMapReadOnlyAtom, true);

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("available");
  });

  it("renders an owned hold as held-other while the seat map is read-only", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "held", mine: true });
    store.set(seatMapReadOnlyAtom, true);

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("held-other");
  });

  it("returns available for a seat without server or local state", () => {
    const store = createStore();

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("available");
  });

  it("returns selected for a locally selected seat", () => {
    const store = createStore();
    store.set(selectedSeatIdsAtom, ["A-1-1"]);

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("selected");
  });

  it("maps a held seat owned by the current user to selected", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "held", mine: true });

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("selected");
  });

  it.each([
    ["without mine", { s: "held" }],
    ["with mine false", { s: "held", mine: false }],
  ] as const)("maps a held seat %s to held-other", (_label, status) => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), status);

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("held-other");
  });

  it("maps a sold seat to sold", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "sold" });

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("sold");
  });

  it("prioritizes local selection over held-other server state", () => {
    const store = createStore();
    store.set(selectedSeatIdsAtom, ["A-1-1"]);
    store.set(seatStatusAtomFamily("A-1-1"), { s: "held", mine: false });

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("selected");
  });
});
