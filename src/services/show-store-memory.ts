import { MOCK_SESSIONS, MOCK_SHOWS } from "@/lib/mock-data";

import type { ShowStore } from "./show-store";

const globalForShowStore = globalThis as typeof globalThis & {
  showStoreMemory?: ShowStore;
};

function makeShowStoreMemory(): ShowStore {
  return {
    async list() {
      return [...MOCK_SHOWS];
    },

    async get(id) {
      const show = MOCK_SHOWS.find((candidate) => candidate.id === id);

      if (!show) return null;

      return {
        show,
        sessions: MOCK_SESSIONS.filter((session) => session.showId === id),
      };
    },

    async create() {
      throw new Error("ShowStore.create — Day 8 스코프");
    },
  };
}

export function createShowStoreMemory(): ShowStore {
  globalForShowStore.showStoreMemory ??= makeShowStoreMemory();
  return globalForShowStore.showStoreMemory;
}
