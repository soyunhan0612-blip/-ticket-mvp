import { createExpiresAt } from "@/lib/hold";
import type { SeatSnapshotEntry } from "@/types";

import { getRedisClient } from "./redis-client";
import type { SeatStore } from "./seat-store";

interface RedisSeatEntry {
  status: "held" | "sold";
  userId: string;
  expiresAt: number;
}

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const HOLD_SCRIPT = `
-- operation: hold
local seatsKey = KEYS[1]
local versionKey = KEYS[2]
local now = tonumber(ARGV[1])
local userId = ARGV[2]
local expiresAt = tonumber(ARGV[3])
local removedExpired = false

for index = 4, #ARGV do
  local seatId = ARGV[index]
  local raw = redis.call("HGET", seatsKey, seatId)
  if raw then
    local entry = cjson.decode(raw)
    -- Keep the boundary identical to isExpired: expiresAt <= now.
    if entry.status == "held" and tonumber(entry.expiresAt) <= now then
      redis.call("HDEL", seatsKey, seatId)
      removedExpired = true
    end
  end
end

local conflicts = {}
for index = 4, #ARGV do
  local seatId = ARGV[index]
  local raw = redis.call("HGET", seatsKey, seatId)
  if raw then
    local entry = cjson.decode(raw)
    if entry.status == "sold" or entry.userId ~= userId then
      table.insert(conflicts, seatId)
    end
  end
end

if #conflicts > 0 then
  if removedExpired then redis.call("INCR", versionKey) end
  local result = {0}
  for _, seatId in ipairs(conflicts) do table.insert(result, seatId) end
  return result
end

local encoded = cjson.encode({status = "held", userId = userId, expiresAt = expiresAt})
for index = 4, #ARGV do
  redis.call("HSET", seatsKey, ARGV[index], encoded)
end
redis.call("INCR", versionKey)
return {1}
`;

const RELEASE_SCRIPT = `
-- operation: release
local seatsKey = KEYS[1]
local versionKey = KEYS[2]
local now = tonumber(ARGV[1])
local userId = ARGV[2]

for index = 3, #ARGV do
  local seatId = ARGV[index]
  local raw = redis.call("HGET", seatsKey, seatId)
  if raw then
    local entry = cjson.decode(raw)
    local expired = entry.status == "held" and tonumber(entry.expiresAt) <= now
    if not expired and entry.userId ~= userId then return {0, seatId} end
  end
end

for index = 3, #ARGV do redis.call("HDEL", seatsKey, ARGV[index]) end
redis.call("INCR", versionKey)
return {1}
`;

const CONFIRM_SCRIPT = `
-- operation: confirm
local seatsKey = KEYS[1]
local versionKey = KEYS[2]
local now = tonumber(ARGV[1])
local userId = ARGV[2]

for index = 3, #ARGV do
  local seatId = ARGV[index]
  local raw = redis.call("HGET", seatsKey, seatId)
  if not raw then return {0, "EXPIRED", seatId, "not-held"} end
  local entry = cjson.decode(raw)
  if entry.status == "held" and tonumber(entry.expiresAt) <= now then
    return {0, "EXPIRED", seatId, "not-held"}
  end
  if entry.status == "sold" then return {0, "EXPIRED", seatId, "sold"} end
  if entry.userId ~= userId then return {0, "FORBIDDEN", seatId} end
end

local encoded = cjson.encode({status = "sold", userId = userId, expiresAt = 0})
for index = 3, #ARGV do redis.call("HSET", seatsKey, ARGV[index], encoded) end
redis.call("INCR", versionKey)
return {1}
`;

const RELEASE_SOLD_SCRIPT = `
-- operation: release-sold
local seatsKey = KEYS[1]
local versionKey = KEYS[2]
local userId = ARGV[2]

for index = 3, #ARGV do
  local seatId = ARGV[index]
  local raw = redis.call("HGET", seatsKey, seatId)
  if raw then
    local entry = cjson.decode(raw)
    if entry.userId ~= userId then return {0, seatId} end
  end
end

for index = 3, #ARGV do redis.call("HDEL", seatsKey, ARGV[index]) end
redis.call("INCR", versionKey)
return {1}
`;

const REVERT_SOLD_SCRIPT = `
-- operation: revert-sold
local seatsKey = KEYS[1]
local versionKey = KEYS[2]

for index = 2, #ARGV do
  local seatId = ARGV[index]
  local raw = redis.call("HGET", seatsKey, seatId)
  if raw and cjson.decode(raw).status == "sold" then
    redis.call("HDEL", seatsKey, seatId)
  end
end
redis.call("INCR", versionKey)
return {1}
`;

const CLEANUP_EXPIRED_SCRIPT = `
-- operation: cleanup-expired
local seatsKey = KEYS[1]
local versionKey = KEYS[2]
local now = tonumber(ARGV[1])
local changed = false

for index = 2, #ARGV do
  local seatId = ARGV[index]
  local raw = redis.call("HGET", seatsKey, seatId)
  if raw then
    local entry = cjson.decode(raw)
    if entry.status == "held" and tonumber(entry.expiresAt) <= now then
      redis.call("HDEL", seatsKey, seatId)
      changed = true
    end
  end
end
if changed then redis.call("INCR", versionKey) end
return {changed and 1 or 0, tonumber(redis.call("GET", versionKey) or "0")}
`;

function keysFor(sessionId: string): [string, string] {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error("invalid sessionId");
  }
  return [`session:${sessionId}:seats`, `session:${sessionId}:version`];
}

function parseEntry(value: unknown): RedisSeatEntry {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object") throw new Error("invalid Redis seat entry");
  const entry = parsed as Partial<RedisSeatEntry>;
  if (
    (entry.status !== "held" && entry.status !== "sold") ||
    typeof entry.userId !== "string" ||
    typeof entry.expiresAt !== "number"
  ) {
    throw new Error("invalid Redis seat entry");
  }
  return entry as RedisSeatEntry;
}

function resultArray(result: unknown): unknown[] {
  if (!Array.isArray(result)) throw new Error("invalid Redis script response");
  return result;
}

export function createSeatStoreRedis(): SeatStore {
  const redis = getRedisClient();

  return {
    async hold(sessionId, seatIds, userId) {
      const keys = keysFor(sessionId);
      const now = Date.now();
      const expiresAt = createExpiresAt(now);
      const result = resultArray(
        await redis.eval(HOLD_SCRIPT, keys, [now, userId, expiresAt, ...seatIds]),
      );
      if (Number(result[0]) === 0) {
        return { conflict: result.slice(1).map(String) };
      }
      return {
        id: crypto.randomUUID(),
        sessionId,
        seatIds: [...seatIds],
        userId,
        expiresAt,
      };
    },

    async release(sessionId, seatIds, userId) {
      const result = resultArray(
        await redis.eval(RELEASE_SCRIPT, keysFor(sessionId), [Date.now(), userId, ...seatIds]),
      );
      if (Number(result[0]) === 0) {
        throw new Error(`FORBIDDEN: seat ${String(result[1])} is owned by another user`);
      }
    },

    async getSnapshot(sessionId, userId) {
      const keys = keysFor(sessionId);
      const serverNow = Date.now();
      const rawSeats = (await redis.hgetall<Record<string, unknown>>(keys[0])) ?? {};
      const entries = Object.entries(rawSeats).map(([seatId, value]) => [
        seatId,
        parseEntry(value),
      ] as const);
      const expiredSeatIds = entries
        .filter(([, entry]) => entry.status === "held" && entry.expiresAt <= serverNow)
        .map(([seatId]) => seatId);

      let version: number;
      if (expiredSeatIds.length > 0) {
        const cleanup = resultArray(
          await redis.eval(CLEANUP_EXPIRED_SCRIPT, keys, [serverNow, ...expiredSeatIds]),
        );
        version = Number(cleanup[1]);
      } else {
        version = Number((await redis.get<number>(keys[1])) ?? 0);
      }

      const expired = new Set(expiredSeatIds);
      const seats: Record<string, SeatSnapshotEntry> = {};
      for (const [seatId, entry] of entries) {
        if (expired.has(seatId)) continue;
        seats[seatId] = {
          s: entry.status,
          ...(entry.userId === userId ? { mine: true } : {}),
          ...(entry.status === "held" ? { expiresAt: entry.expiresAt } : {}),
        };
      }
      return { version, serverNow, seats };
    },

    async confirmSeats(sessionId, seatIds, userId) {
      const result = resultArray(
        await redis.eval(CONFIRM_SCRIPT, keysFor(sessionId), [Date.now(), userId, ...seatIds]),
      );
      if (Number(result[0]) !== 0) return;
      const prefix = String(result[1]);
      const seatId = String(result[2]);
      if (prefix === "FORBIDDEN") {
        throw new Error(`FORBIDDEN: seat ${seatId} is owned by another user`);
      }
      const detail = String(result[3]);
      throw new Error(
        `EXPIRED: seat ${seatId} is ${detail === "sold" ? "already sold" : "not held"}`,
      );
    },

    async releaseSold(sessionId, seatIds, userId) {
      const result = resultArray(
        await redis.eval(RELEASE_SOLD_SCRIPT, keysFor(sessionId), [0, userId, ...seatIds]),
      );
      if (Number(result[0]) === 0) {
        throw new Error(`FORBIDDEN: seat ${String(result[1])} is owned by another user`);
      }
    },

    async revertSold(sessionId, seatIds) {
      await redis.eval(REVERT_SOLD_SCRIPT, keysFor(sessionId), [0, ...seatIds]);
    },
  };
}
