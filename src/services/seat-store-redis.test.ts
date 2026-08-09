import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HOLD_TTL_MS } from "@/lib/hold";

const NOW = new Date("2026-08-09T00:00:00.000Z");

type Entry = { status: "held" | "sold"; userId: string; expiresAt: number };

const hashes = new Map<string, Map<string, Entry>>();
const versions = new Map<string, number>();
const evalCalls: Array<{ script: string; keys: string[]; args: unknown[] }> = [];
let hgetallCalls = 0;

function hash(key: string) {
  let value = hashes.get(key);
  if (!value) {
    value = new Map();
    hashes.set(key, value);
  }
  return value;
}

function increment(key: string) {
  versions.set(key, (versions.get(key) ?? 0) + 1);
}

const redis = {
  async hgetall(key: string) {
    hgetallCalls += 1;
    return Object.fromEntries(
      [...hash(key)].map(([seatId, entry]) => [seatId, JSON.stringify(entry)]),
    );
  },
  async get(key: string) {
    return versions.get(key) ?? null;
  },
  async eval(script: string, keys: string[], args: unknown[]) {
    evalCalls.push({ script, keys, args });
    const [seatsKey, versionKey] = keys;
    const operation = script.match(/-- operation: ([a-z-]+)/)?.[1];
    const seats = hash(seatsKey);
    const now = Number(args[0]);
    const userId = String(args[1] ?? "");
    const seatIds = args.slice(operation === "revert-sold" ? 1 : 2).map(String);

    if (operation === "hold") {
      const expiresAt = Number(args[2]);
      const holdSeatIds = args.slice(3).map(String);
      let removedExpired = false;
      for (const seatId of holdSeatIds) {
        const entry = seats.get(seatId);
        if (entry?.status === "held" && entry.expiresAt <= now) {
          seats.delete(seatId);
          removedExpired = true;
        }
      }
      const conflicts = holdSeatIds.filter((seatId) => {
        const entry = seats.get(seatId);
        return entry && (entry.status === "sold" || entry.userId !== userId);
      });
      if (conflicts.length) {
        if (removedExpired) increment(versionKey);
        return [0, ...conflicts];
      }
      for (const seatId of holdSeatIds) {
        seats.set(seatId, { status: "held", userId, expiresAt });
      }
      increment(versionKey);
      return [1];
    }

    if (operation === "release") {
      for (const seatId of seatIds) {
        const entry = seats.get(seatId);
        if (entry?.status === "held" && entry.expiresAt <= now) continue;
        if (entry && entry.userId !== userId) return [0, seatId];
      }
      seatIds.forEach((seatId) => seats.delete(seatId));
      increment(versionKey);
      return [1];
    }

    if (operation === "confirm") {
      for (const seatId of seatIds) {
        const entry = seats.get(seatId);
        if (!entry || (entry.status === "held" && entry.expiresAt <= now)) {
          return [0, "EXPIRED", seatId, "not-held"];
        }
        if (entry.status === "sold") return [0, "EXPIRED", seatId, "sold"];
        if (entry.userId !== userId) return [0, "FORBIDDEN", seatId];
      }
      for (const seatId of seatIds) {
        seats.set(seatId, { status: "sold", userId, expiresAt: 0 });
      }
      increment(versionKey);
      return [1];
    }

    if (operation === "release-sold") {
      for (const seatId of seatIds) {
        const entry = seats.get(seatId);
        if (entry && entry.userId !== userId) return [0, seatId];
      }
      seatIds.forEach((seatId) => seats.delete(seatId));
      increment(versionKey);
      return [1];
    }

    if (operation === "revert-sold") {
      for (const seatId of args.slice(1).map(String)) {
        if (seats.get(seatId)?.status === "sold") seats.delete(seatId);
      }
      increment(versionKey);
      return [1];
    }

    if (operation === "cleanup-expired") {
      let changed = false;
      for (const seatId of args.slice(1).map(String)) {
        const entry = seats.get(seatId);
        if (entry?.status === "held" && entry.expiresAt <= now) {
          seats.delete(seatId);
          changed = true;
        }
      }
      if (changed) increment(versionKey);
      return [changed ? 1 : 0, versions.get(versionKey) ?? 0];
    }

    throw new Error(`unknown script: ${operation}`);
  },
};

vi.mock("./redis-client", () => ({ getRedisClient: () => redis }));

import { createSeatStoreRedis } from "./seat-store-redis";

describe("SeatStore Redis", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    hashes.clear();
    versions.clear();
    evalCalls.length = 0;
    hgetallCalls = 0;
  });

  afterEach(() => vi.useRealTimers());

  it("holds multiple seats atomically with one Lua call", async () => {
    const result = await createSeatStoreRedis().hold("hold-empty", ["A-1-1", "A-1-2"], "user-a");
    expect(result).toMatchObject({
      sessionId: "hold-empty",
      seatIds: ["A-1-1", "A-1-2"],
      userId: "user-a",
      expiresAt: NOW.getTime() + HOLD_TTL_MS,
    });
    expect(evalCalls).toHaveLength(1);
    expect(evalCalls[0].keys).toEqual([
      "session:hold-empty:seats",
      "session:hold-empty:version",
    ]);
    expect(evalCalls[0].script).toContain("expiresAt <= now");
  });

  it("returns conflicts without partially holding other requested seats", async () => {
    const store = createSeatStoreRedis();
    await store.hold("hold-atomic", ["A-1-2"], "user-a");
    await expect(store.hold("hold-atomic", ["A-1-1", "A-1-2", "A-1-3"], "user-b"))
      .resolves.toEqual({ conflict: ["A-1-2"] });
    expect((await store.getSnapshot("hold-atomic", "user-b")).seats).toEqual({
      "A-1-2": { s: "held", expiresAt: NOW.getTime() + HOLD_TTL_MS },
    });
  });

  it("allows an expired seat to be held again", async () => {
    const store = createSeatStoreRedis();
    await store.hold("hold-expired", ["A-1-1"], "user-a");
    vi.advanceTimersByTime(HOLD_TTL_MS);
    await expect(store.hold("hold-expired", ["A-1-1"], "user-b"))
      .resolves.toMatchObject({ userId: "user-b" });
  });

  it("allows the same user to refresh a hold", async () => {
    const store = createSeatStoreRedis();
    await store.hold("hold-refresh", ["A-1-1"], "user-a");
    vi.advanceTimersByTime(1_000);
    const result = await store.hold("hold-refresh", ["A-1-1"], "user-a");
    expect("expiresAt" in result && result.expiresAt).toBe(NOW.getTime() + 1_000 + HOLD_TTL_MS);
  });

  it("increments version when an expired seat is removed despite a conflict", async () => {
    const store = createSeatStoreRedis();
    await store.hold("hold-clean-conflict", ["A-1-1"], "user-a");
    await store.hold("hold-clean-conflict", ["A-1-2"], "user-b");
    vi.advanceTimersByTime(HOLD_TTL_MS);
    await store.hold("hold-clean-conflict", ["A-1-2"], "user-b");
    const before = versions.get("session:hold-clean-conflict:version") ?? 0;
    await expect(store.hold("hold-clean-conflict", ["A-1-1", "A-1-2"], "user-c"))
      .resolves.toEqual({ conflict: ["A-1-2"] });
    expect(versions.get("session:hold-clean-conflict:version")).toBe(before + 1);
  });

  it("releases owned, sold, expired foreign, and missing seats", async () => {
    const store = createSeatStoreRedis();
    await store.hold("release-cases", ["A-1-1", "A-1-2"], "user-a");
    await store.confirmSeats("release-cases", ["A-1-2"], "user-a");
    vi.advanceTimersByTime(HOLD_TTL_MS);
    await expect(store.release("release-cases", ["A-1-1", "A-1-2", "A-1-3"], "user-a"))
      .resolves.toBeUndefined();
    expect((await store.getSnapshot("release-cases", "user-a")).seats).toEqual({});
  });

  it("allows release of another user's expired hold", async () => {
    const store = createSeatStoreRedis();
    await store.hold("release-expired-other", ["A-1-1"], "user-a");
    vi.advanceTimersByTime(HOLD_TTL_MS);
    await expect(store.release("release-expired-other", ["A-1-1"], "user-b"))
      .resolves.toBeUndefined();
  });

  it("throws FORBIDDEN without deleting any requested seat", async () => {
    const store = createSeatStoreRedis();
    await store.hold("release-atomic", ["A-1-1"], "user-a");
    await store.hold("release-atomic", ["A-1-2"], "user-b");
    await expect(store.release("release-atomic", ["A-1-1", "A-1-2"], "user-a"))
      .rejects.toThrow("FORBIDDEN:");
    expect(Object.keys((await store.getSnapshot("release-atomic", "user-a")).seats)).toEqual([
      "A-1-1", "A-1-2",
    ]);
  });

  it("confirms seats atomically and emits the required error prefixes", async () => {
    const store = createSeatStoreRedis();
    await store.hold("confirm", ["A-1-1"], "user-a");
    await store.hold("confirm", ["A-1-2"], "user-b");
    await expect(store.confirmSeats("confirm", ["A-1-1", "A-1-2"], "user-a"))
      .rejects.toThrow("FORBIDDEN:");
    expect((await store.getSnapshot("confirm", "user-a")).seats["A-1-1"]?.s).toBe("held");
    await expect(store.confirmSeats("confirm", ["A-1-3"], "user-a"))
      .rejects.toThrow("EXPIRED:");
    await store.confirmSeats("confirm", ["A-1-1"], "user-a");
    expect((await store.getSnapshot("confirm", "user-a")).seats["A-1-1"]).toEqual({
      s: "sold",
      mine: true,
    });
    await expect(store.confirmSeats("confirm", ["A-1-1"], "user-a"))
      .rejects.toThrow("EXPIRED:");
  });

  it("rejects an expired hold during confirmation", async () => {
    const store = createSeatStoreRedis();
    await store.hold("confirm-expired", ["A-1-1"], "user-a");
    vi.advanceTimersByTime(HOLD_TTL_MS);
    await expect(store.confirmSeats("confirm-expired", ["A-1-1"], "user-a"))
      .rejects.toThrow("EXPIRED:");
  });

  it("releaseSold validates ownership and revertSold does not", async () => {
    const store = createSeatStoreRedis();
    await store.hold("sold", ["A-1-1", "A-1-2"], "user-a");
    await store.confirmSeats("sold", ["A-1-1", "A-1-2"], "user-a");
    await expect(store.releaseSold("sold", ["A-1-1"], "user-b"))
      .rejects.toThrow("FORBIDDEN:");
    await store.revertSold("sold", ["A-1-1"]);
    await store.releaseSold("sold", ["A-1-2"], "user-a");
    expect((await store.getSnapshot("sold", "user-a")).seats).toEqual({});
  });

  it("returns sparse snapshots, removes expired entries, and never exposes userId", async () => {
    const store = createSeatStoreRedis();
    await store.hold("snapshot", ["A-1-1"], "user-a");
    const own = await store.getSnapshot("snapshot", "user-a");
    expect(hgetallCalls).toBe(1);
    expect(own.seats["A-1-1"]).toEqual({
      s: "held", mine: true, expiresAt: NOW.getTime() + HOLD_TTL_MS,
    });
    expect(JSON.stringify(own)).not.toContain("userId");
    const before = own.version;
    vi.advanceTimersByTime(HOLD_TTL_MS);
    const expired = await store.getSnapshot("snapshot", "user-b");
    expect(expired.seats).toEqual({});
    expect(expired.version).toBe(before + 1);
  });

  it("increments version for every successful state transition", async () => {
    const store = createSeatStoreRedis();
    expect((await store.getSnapshot("versions", "user-a")).version).toBe(0);
    await store.hold("versions", ["A-1-1"], "user-a");
    expect((await store.getSnapshot("versions", "user-a")).version).toBe(1);
    await store.release("versions", ["A-1-1"], "user-a");
    expect((await store.getSnapshot("versions", "user-a")).version).toBe(2);
    await store.hold("versions", ["A-1-1"], "user-a");
    await store.confirmSeats("versions", ["A-1-1"], "user-a");
    expect((await store.getSnapshot("versions", "user-a")).version).toBe(4);
    await store.revertSold("versions", ["A-1-1"]);
    expect((await store.getSnapshot("versions", "user-a")).version).toBe(5);
    await store.hold("versions", ["A-1-1"], "user-a");
    await store.confirmSeats("versions", ["A-1-1"], "user-a");
    await store.releaseSold("versions", ["A-1-1"], "user-a");
    expect((await store.getSnapshot("versions", "user-a")).version).toBe(8);
  });

  it("rejects unsafe session IDs before constructing Redis keys", async () => {
    await expect(createSeatStoreRedis().getSnapshot("bad:session", "user-a"))
      .rejects.toThrow("invalid sessionId");
    expect(evalCalls).toHaveLength(0);
  });
});
