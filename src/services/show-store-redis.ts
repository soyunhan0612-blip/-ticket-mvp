import { MOCK_SESSIONS, MOCK_SHOWS } from "@/lib/mock-data";
import { generateSessionsForShow } from "@/lib/seat-preset";
import { createShowInputSchema } from "@/lib/show-validation";
import type { Session, Show } from "@/types";

import { getRedisClient } from "./redis-client";
import type { ShowStore } from "./show-store";

const SHOWS_KEY = "shows";
const SESSIONS_KEY = "sessions";
const SESSION_SHOWS_KEY = "session-shows";
const SHOW_SESSIONS_KEY = "show-sessions";

function serializeFields<T extends { id: string }>(values: readonly T[]): Record<string, string> {
  return Object.fromEntries(values.map((value) => [value.id, JSON.stringify(value)]));
}

function parseValue<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

export function createShowStoreRedis(): ShowStore {
  const redis = getRedisClient();
  let seedPromise: Promise<void> | undefined;

  async function seed(): Promise<void> {
    // A new serverless container starts with an empty seedPromise, so without this
    // check every cold start would rewrite the same four seed hashes.
    const seedMarker = MOCK_SHOWS[0]?.id;
    if (seedMarker && (await redis.hget(SHOWS_KEY, seedMarker)) !== null) return;

    const sessionsByShow = Object.fromEntries(
      MOCK_SHOWS.map((show) => [
        show.id,
        JSON.stringify(MOCK_SESSIONS.filter((session) => session.showId === show.id)),
      ]),
    );

    await redis.hset(SHOWS_KEY, serializeFields(MOCK_SHOWS));
    await redis.hset(SESSIONS_KEY, serializeFields(MOCK_SESSIONS));
    await redis.hset(
      SESSION_SHOWS_KEY,
      Object.fromEntries(MOCK_SESSIONS.map((session) => [session.id, session.showId])),
    );
    await redis.hset(SHOW_SESSIONS_KEY, sessionsByShow);
  }

  function ensureSeeded(): Promise<void> {
    seedPromise ??= seed();
    return seedPromise;
  }

  return {
    async list() {
      await ensureSeeded();
      const values = (await redis.hgetall<Record<string, unknown>>(SHOWS_KEY)) ?? {};
      return Object.values(values).map((value) => parseValue<Show>(value));
    },

    async get(id) {
      await ensureSeeded();
      const rawShow = await redis.hget<unknown>(SHOWS_KEY, id);
      if (rawShow === null) return null;

      const rawSessions = await redis.hget<unknown>(SHOW_SESSIONS_KEY, id);
      return {
        show: parseValue<Show>(rawShow),
        sessions: rawSessions === null ? [] : parseValue<Session[]>(rawSessions),
      };
    },

    async getBySessionId(sessionId) {
      await ensureSeeded();
      const showId = await redis.hget<string>(SESSION_SHOWS_KEY, sessionId);
      if (showId === null) return null;

      const [rawShow, rawSession] = await Promise.all([
        redis.hget<unknown>(SHOWS_KEY, showId),
        redis.hget<unknown>(SESSIONS_KEY, sessionId),
      ]);
      if (rawShow === null || rawSession === null) return null;

      return {
        show: parseValue<Show>(rawShow),
        session: parseValue<Session>(rawSession),
      };
    },

    async create(input) {
      const parsedInput = createShowInputSchema.parse(input);
      await ensureSeeded();

      const show: Show = {
        id: crypto.randomUUID(),
        title: parsedInput.title,
        description: parsedInput.description,
        posterUrl: parsedInput.posterUrl,
        presetId: parsedInput.presetId,
      };
      const sessions = generateSessionsForShow(show.id, parsedInput.sessions);

      await redis.hset(SHOWS_KEY, { [show.id]: JSON.stringify(show) });
      await redis.hset(SESSIONS_KEY, serializeFields(sessions));
      await redis.hset(
        SESSION_SHOWS_KEY,
        Object.fromEntries(sessions.map((session) => [session.id, show.id])),
      );
      await redis.hset(SHOW_SESSIONS_KEY, { [show.id]: JSON.stringify(sessions) });

      return { show, sessions };
    },
  };
}
