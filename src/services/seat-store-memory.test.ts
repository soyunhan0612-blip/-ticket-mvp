import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HOLD_TTL_MS } from "@/lib/hold";

import { createSeatStoreMemory } from "./seat-store-memory";

const NOW = new Date("2026-08-08T00:00:00.000Z");

describe("SeatStore memory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("hold", () => {
    it("holds seats in an empty session", async () => {
      const store = createSeatStoreMemory();
      const result = await store.hold("hold-empty", ["A-1-1", "A-1-2"], "user-a");

      expect(result).toMatchObject({
        sessionId: "hold-empty",
        seatIds: ["A-1-1", "A-1-2"],
        userId: "user-a",
        expiresAt: NOW.getTime() + HOLD_TTL_MS,
      });
      expect(result).toHaveProperty("id", expect.any(String));
    });

    it("returns a conflict when another user holds a seat", async () => {
      const store = createSeatStoreMemory();
      await store.hold("hold-conflict", ["A-1-1"], "user-a");

      await expect(store.hold("hold-conflict", ["A-1-1"], "user-b"))
        .resolves.toEqual({ conflict: ["A-1-1"] });
    });

    it("does not partially hold a multi-seat request with a conflict", async () => {
      const store = createSeatStoreMemory();
      await store.hold("hold-atomic", ["A-1-2"], "user-a");

      await expect(store.hold("hold-atomic", ["A-1-1", "A-1-2", "A-1-3"], "user-b"))
        .resolves.toEqual({ conflict: ["A-1-2"] });

      const snapshot = await store.getSnapshot("hold-atomic", "user-b");
      expect(snapshot.seats).toEqual({
        "A-1-2": { s: "held", expiresAt: NOW.getTime() + HOLD_TTL_MS },
      });
    });

    it("allows an expired seat to be held again", async () => {
      const store = createSeatStoreMemory();
      await store.hold("hold-expired", ["A-1-1"], "user-a");
      vi.advanceTimersByTime(HOLD_TTL_MS);

      const result = await store.hold("hold-expired", ["A-1-1"], "user-b");

      expect(result).toMatchObject({ userId: "user-b", seatIds: ["A-1-1"] });
    });

    it("refreshes expiresAt when the same user holds a seat again", async () => {
      const store = createSeatStoreMemory();
      const first = await store.hold("hold-refresh", ["A-1-1"], "user-a");
      vi.advanceTimersByTime(1_000);

      const second = await store.hold("hold-refresh", ["A-1-1"], "user-a");

      expect("expiresAt" in first && "expiresAt" in second && second.expiresAt)
        .toBe(NOW.getTime() + 1_000 + HOLD_TTL_MS);
    });
  });

  describe("release", () => {
    it("removes seats owned by the requester", async () => {
      const store = createSeatStoreMemory();
      await store.hold("release-own", ["A-1-1"], "user-a");

      await store.release("release-own", ["A-1-1"], "user-a");

      await expect(store.getSnapshot("release-own", "user-a"))
        .resolves.toMatchObject({ seats: {} });
    });

    it("throws FORBIDDEN when another user owns a seat", async () => {
      const store = createSeatStoreMemory();
      await store.hold("release-other", ["A-1-1"], "user-a");

      await expect(store.release("release-other", ["A-1-1"], "user-b"))
        .rejects.toThrow("FORBIDDEN");
    });

    it("ignores seats that do not exist", async () => {
      const store = createSeatStoreMemory();

      await expect(store.release("release-missing", ["A-1-1"], "user-a"))
        .resolves.toBeUndefined();
    });
  });

  describe("getSnapshot", () => {
    it("returns an empty seat record for an empty session", async () => {
      const store = createSeatStoreMemory();

      await expect(store.getSnapshot("snapshot-empty", "user-a")).resolves.toEqual({
        version: 0,
        serverNow: NOW.getTime(),
        seats: {},
      });
    });

    it("marks the requester's held seat as mine and includes expiresAt", async () => {
      const store = createSeatStoreMemory();
      await store.hold("snapshot-own", ["A-1-1"], "user-a");

      const snapshot = await store.getSnapshot("snapshot-own", "user-a");

      expect(snapshot.seats["A-1-1"]).toEqual({
        s: "held",
        mine: true,
        expiresAt: NOW.getTime() + HOLD_TTL_MS,
      });
    });

    it("does not expose ownership data for another user's held seat", async () => {
      const store = createSeatStoreMemory();
      await store.hold("snapshot-other", ["A-1-1"], "user-a");

      const snapshot = await store.getSnapshot("snapshot-other", "user-b");

      expect(snapshot.seats["A-1-1"]).toEqual({
        s: "held",
        expiresAt: NOW.getTime() + HOLD_TTL_MS,
      });
      expect(snapshot.seats["A-1-1"]).not.toHaveProperty("userId");
    });

    it("removes expired held seats", async () => {
      const store = createSeatStoreMemory();
      await store.hold("snapshot-expired", ["A-1-1"], "user-a");
      vi.advanceTimersByTime(HOLD_TTL_MS);

      const snapshot = await store.getSnapshot("snapshot-expired", "user-a");

      expect(snapshot.seats).toEqual({});
    });

    it("increments version for hold and release", async () => {
      const store = createSeatStoreMemory();
      expect((await store.getSnapshot("snapshot-version", "user-a")).version).toBe(0);

      await store.hold("snapshot-version", ["A-1-1"], "user-a");
      expect((await store.getSnapshot("snapshot-version", "user-a")).version).toBe(1);

      await store.release("snapshot-version", ["A-1-1"], "user-a");
      expect((await store.getSnapshot("snapshot-version", "user-a")).version).toBe(2);
    });
  });
});
