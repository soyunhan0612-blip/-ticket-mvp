import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HOLD_TTL_MS } from "@/lib/hold";

import { createSeatStoreMemory } from "./seat-store-memory";
import { createReservationStoreMemory } from "./reservation-store-memory";

const NOW = new Date("2026-08-08T00:00:00.000Z");

describe("ReservationStore memory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("create", () => {
    it("creates a reservation from held seats (held → sold + record)", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await seatStore.hold("res-create", ["A-1-1", "A-1-2"], "user-a");
      const reservation = await store.create("res-create", ["A-1-1", "A-1-2"], "user-a");

      expect(reservation).toMatchObject({
        sessionId: "res-create",
        seatIds: ["A-1-1", "A-1-2"],
        userId: "user-a",
        status: "confirmed",
      });
      expect(reservation).toHaveProperty("id", expect.any(String));
      expect(reservation).toHaveProperty("createdAt", expect.any(Number));

      // Seats should be sold
      const snapshot = await seatStore.getSnapshot("res-create", "user-a");
      expect(snapshot.seats["A-1-1"]?.s).toBe("sold");
      expect(snapshot.seats["A-1-2"]?.s).toBe("sold");
    });

    it("throws FORBIDDEN when owner does not match, seats unchanged", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await seatStore.hold("res-forbidden", ["A-1-1"], "user-a");

      await expect(store.create("res-forbidden", ["A-1-1"], "user-b"))
        .rejects.toThrow("FORBIDDEN");

      const snapshot = await seatStore.getSnapshot("res-forbidden", "user-a");
      expect(snapshot.seats["A-1-1"]?.s).toBe("held");
    });

    it("throws EXPIRED for expired hold, seats unchanged", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await seatStore.hold("res-expired", ["A-1-1"], "user-a");
      vi.advanceTimersByTime(HOLD_TTL_MS);

      await expect(store.create("res-expired", ["A-1-1"], "user-a"))
        .rejects.toThrow("EXPIRED");
    });
  });

  describe("listByUser", () => {
    it("returns only the user's reservations", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await seatStore.hold("res-list-a", ["A-1-1"], "list-user-a");
      await store.create("res-list-a", ["A-1-1"], "list-user-a");

      await seatStore.hold("res-list-b", ["A-1-2"], "list-user-b");
      await store.create("res-list-b", ["A-1-2"], "list-user-b");

      const listA = await store.listByUser("list-user-a");
      expect(listA).toHaveLength(1);
      expect(listA[0]).toMatchObject({ userId: "list-user-a" });
    });

    it("does not include other user's reservations", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await seatStore.hold("res-list-other", ["A-1-1"], "list-only-user");
      await store.create("res-list-other", ["A-1-1"], "list-only-user");

      const list = await store.listByUser("list-nobody");
      expect(list).toHaveLength(0);
    });

    it("returns an empty array when no reservations exist", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      const list = await store.listByUser("list-empty-user");
      expect(list).toEqual([]);
    });
  });

  describe("cancel", () => {
    it("cancels a reservation and reverts seats to available", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await seatStore.hold("res-cancel", ["A-1-1"], "user-a");
      const reservation = await store.create("res-cancel", ["A-1-1"], "user-a");

      const cancelled = await store.cancel(reservation.id, "user-a");

      expect(cancelled.status).toBe("cancelled");

      const snapshot = await seatStore.getSnapshot("res-cancel", "user-a");
      expect(snapshot.seats).toEqual({});
    });

    it("returns cancelled status on the reservation", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await seatStore.hold("res-cancel-status", ["A-1-1"], "user-a");
      const reservation = await store.create("res-cancel-status", ["A-1-1"], "user-a");

      const cancelled = await store.cancel(reservation.id, "user-a");
      expect(cancelled.status).toBe("cancelled");
    });

    it("throws FORBIDDEN when owner does not match", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await seatStore.hold("res-cancel-forbidden", ["A-1-1"], "user-a");
      const reservation = await store.create("res-cancel-forbidden", ["A-1-1"], "user-a");

      await expect(store.cancel(reservation.id, "user-b"))
        .rejects.toThrow("FORBIDDEN");
    });

    it("throws ALREADY_CANCELLED for already cancelled reservation", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await seatStore.hold("res-cancel-twice", ["A-1-1"], "user-a");
      const reservation = await store.create("res-cancel-twice", ["A-1-1"], "user-a");
      await store.cancel(reservation.id, "user-a");

      await expect(store.cancel(reservation.id, "user-a"))
        .rejects.toThrow("ALREADY_CANCELLED");
    });

    it("throws error for non-existent reservation", async () => {
      const seatStore = createSeatStoreMemory();
      const store = createReservationStoreMemory(seatStore);

      await expect(store.cancel("non-existent-id", "user-a"))
        .rejects.toThrow("NOT_FOUND");
    });
  });
});
