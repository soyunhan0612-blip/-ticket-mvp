import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HOLD_TTL_MS } from "@/lib/hold";

const hashes = new Map<string, Map<string, unknown>>();
const sets = new Map<string, Set<string>>();
let failNextReservationWrite = false;

function hash(key: string): Map<string, unknown> {
  let value = hashes.get(key);
  if (!value) {
    value = new Map();
    hashes.set(key, value);
  }
  return value;
}

const redis = {
  async hget<T>(key: string, field: string): Promise<T | null> {
    return (hash(key).get(field) as T | undefined) ?? null;
  },
  async hset(key: string, values: Record<string, unknown>): Promise<number> {
    const target = hash(key);
    for (const [field, value] of Object.entries(values)) target.set(field, value);
    return Object.keys(values).length;
  },
  async sadd(key: string, ...members: string[]): Promise<number> {
    let target = sets.get(key);
    if (!target) {
      target = new Set();
      sets.set(key, target);
    }
    const before = target.size;
    members.forEach((member) => target!.add(member));
    return target.size - before;
  },
  async smembers(key: string): Promise<string[]> {
    return [...(sets.get(key) ?? [])];
  },
  async eval(script: string, keys: string[], args: unknown[]): Promise<number> {
    const operation = script.match(/-- operation: ([a-z-]+)/)?.[1];
    if (operation === "create-reservation") {
      if (failNextReservationWrite) {
        failNextReservationWrite = false;
        throw new Error("reservation write failed");
      }
      hash(keys[0]!).set(String(args[0]), args[1]);
      let index = sets.get(keys[1]!);
      if (!index) {
        index = new Set();
        sets.set(keys[1]!, index);
      }
      index.add(String(args[0]));
      return 1;
    }
    throw new Error(`unknown script: ${operation}`);
  },
};

vi.mock("./redis-client", () => ({ getRedisClient: () => redis }));

import { createReservationStoreRedis } from "./reservation-store-redis";
import { createSeatStoreMemory } from "./seat-store-memory";

const NOW = new Date("2026-08-09T00:00:00.000Z");

describe("ReservationStore Redis", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    hashes.clear();
    sets.clear();
    failNextReservationWrite = false;
  });

  afterEach(() => vi.useRealTimers());

  it("creates a confirmed reservation after changing held seats to sold", async () => {
    const seatStore = createSeatStoreMemory();
    const store = createReservationStoreRedis(seatStore);
    await seatStore.hold("redis-create", ["A-1-1", "A-1-2"], "user-a");

    const reservation = await store.create(
      "redis-create",
      ["A-1-1", "A-1-2"],
      "user-a",
    );

    expect(reservation).toMatchObject({
      sessionId: "redis-create",
      seatIds: ["A-1-1", "A-1-2"],
      userId: "user-a",
      status: "confirmed",
    });
    const snapshot = await seatStore.getSnapshot("redis-create", "user-a");
    expect(snapshot.seats["A-1-1"]?.s).toBe("sold");
    expect(snapshot.seats["A-1-2"]?.s).toBe("sold");
  });

  it("preserves seats when another user tries to create a reservation", async () => {
    const seatStore = createSeatStoreMemory();
    const store = createReservationStoreRedis(seatStore);
    await seatStore.hold("redis-forbidden", ["A-1-1"], "user-a");

    await expect(store.create("redis-forbidden", ["A-1-1"], "user-b"))
      .rejects.toThrow(/^FORBIDDEN:/);

    expect((await seatStore.getSnapshot("redis-forbidden", "user-a")).seats["A-1-1"]?.s)
      .toBe("held");
  });

  it("does not create a reservation from an expired hold", async () => {
    const seatStore = createSeatStoreMemory();
    const store = createReservationStoreRedis(seatStore);
    await seatStore.hold("redis-expired", ["A-1-1"], "user-a");
    vi.advanceTimersByTime(HOLD_TTL_MS);

    await expect(store.create("redis-expired", ["A-1-1"], "user-a"))
      .rejects.toThrow(/^EXPIRED:/);
    await expect(store.listByUser("user-a")).resolves.toEqual([]);
  });

  it("rolls sold seats back when the reservation record write fails", async () => {
    const seatStore = createSeatStoreMemory();
    const store = createReservationStoreRedis(seatStore);
    await seatStore.hold("redis-write-failure", ["A-1-1"], "user-a");
    failNextReservationWrite = true;

    await expect(store.create("redis-write-failure", ["A-1-1"], "user-a"))
      .rejects.toThrow("reservation write failed");
    expect((await seatStore.getSnapshot("redis-write-failure", "user-a")).seats).toEqual({});
    await expect(store.listByUser("user-a")).resolves.toEqual([]);
  });

  it("lists only reservations from the requested user's index", async () => {
    const seatStore = createSeatStoreMemory();
    const store = createReservationStoreRedis(seatStore);
    await seatStore.hold("redis-list-a", ["A-1-1"], "user-a");
    await store.create("redis-list-a", ["A-1-1"], "user-a");
    await seatStore.hold("redis-list-b", ["A-1-2"], "user-b");
    await store.create("redis-list-b", ["A-1-2"], "user-b");

    const reservations = await store.listByUser("user-a");

    expect(reservations).toHaveLength(1);
    expect(reservations[0]?.userId).toBe("user-a");
  });

  it("returns an empty list when the user has no reservation index", async () => {
    const seatStore = createSeatStoreMemory();

    await expect(createReservationStoreRedis(seatStore).listByUser("nobody"))
      .resolves.toEqual([]);
  });

  it("cancels a reservation and releases its sold seats", async () => {
    const seatStore = createSeatStoreMemory();
    const store = createReservationStoreRedis(seatStore);
    await seatStore.hold("redis-cancel", ["A-1-1"], "user-a");
    const reservation = await store.create("redis-cancel", ["A-1-1"], "user-a");

    const cancelled = await store.cancel(reservation.id, "user-a");

    expect(cancelled.status).toBe("cancelled");
    expect((await seatStore.getSnapshot("redis-cancel", "user-a")).seats).toEqual({});
  });

  it("rejects a duplicate cancellation", async () => {
    const seatStore = createSeatStoreMemory();
    const store = createReservationStoreRedis(seatStore);
    await seatStore.hold("redis-cancel-twice", ["A-1-1"], "user-a");
    const reservation = await store.create("redis-cancel-twice", ["A-1-1"], "user-a");
    await store.cancel(reservation.id, "user-a");

    await expect(store.cancel(reservation.id, "user-a"))
      .rejects.toThrow(/^ALREADY_CANCELLED:/);
  });

  it("rejects another user's cancellation without changing the reservation", async () => {
    const seatStore = createSeatStoreMemory();
    const store = createReservationStoreRedis(seatStore);
    await seatStore.hold("redis-cancel-forbidden", ["A-1-1"], "user-a");
    const reservation = await store.create("redis-cancel-forbidden", ["A-1-1"], "user-a");

    await expect(store.cancel(reservation.id, "user-b"))
      .rejects.toThrow(/^FORBIDDEN:/);

    expect((await store.listByUser("user-a"))[0]?.status).toBe("confirmed");
    expect((await seatStore.getSnapshot("redis-cancel-forbidden", "user-a")).seats["A-1-1"]?.s)
      .toBe("sold");
  });

  it("throws NOT_FOUND for a missing reservation", async () => {
    const seatStore = createSeatStoreMemory();

    await expect(createReservationStoreRedis(seatStore).cancel("missing", "user-a"))
      .rejects.toThrow(/^NOT_FOUND:/);
  });

  it("loads reservations after creating a new store instance", async () => {
    const seatStore = createSeatStoreMemory();
    const first = createReservationStoreRedis(seatStore);
    await seatStore.hold("redis-restart", ["A-1-1"], "user-a");
    const reservation = await first.create("redis-restart", ["A-1-1"], "user-a");

    const restarted = createReservationStoreRedis(seatStore);

    await expect(restarted.listByUser("user-a")).resolves.toEqual([reservation]);
  });
});
