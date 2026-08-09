import { MOCK_SESSIONS, MOCK_SHOWS } from "@/lib/mock-data";
import { generateSessionsForShow } from "@/lib/seat-preset";
import { createShowInputSchema } from "@/lib/show-validation";
import type { Session, Show } from "@/types";

import type { ShowStore } from "./show-store";

const globalForShowStore = globalThis as typeof globalThis & {
  showStoreMemory?: ShowStore;
};

function makeShowStoreMemory(): ShowStore {
  const shows: Show[] = [...MOCK_SHOWS];
  const sessions: Session[] = [...MOCK_SESSIONS];

  return {
    async list() {
      return [...shows];
    },

    async get(id) {
      const show = shows.find((candidate) => candidate.id === id);

      if (!show) return null;

      return {
        show,
        sessions: sessions.filter((session) => session.showId === id),
      };
    },

    async create(input) {
      const parsedInput = createShowInputSchema.parse(input);
      const show: Show = {
        id: crypto.randomUUID(),
        title: parsedInput.title,
        description: parsedInput.description,
        posterUrl: parsedInput.posterUrl,
        presetId: parsedInput.presetId,
      };
      const generatedSessions = generateSessionsForShow(
        show.id,
        parsedInput.sessions,
      );

      shows.push(show);
      sessions.push(...generatedSessions);

      return { show, sessions: generatedSessions };
    },
  };
}

export function createShowStoreMemory(): ShowStore {
  globalForShowStore.showStoreMemory ??= makeShowStoreMemory();
  return globalForShowStore.showStoreMemory;
}
