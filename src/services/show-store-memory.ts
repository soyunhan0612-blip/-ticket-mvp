import { compareShowOrder, MOCK_SESSIONS, MOCK_SHOWS } from "@/lib/mock-data";
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
      /*
       * Redis 구현과 같은 정렬을 건다. 여기서 등록 순서를 그대로 돌려주면 같은
       * 데이터가 저장소에 따라 다른 순서로 보여, 로컬에서 검증한 목록 순서가
       * 프로덕션과 어긋난다 — 순서 회귀를 로컬에서 재현할 수 없게 된다.
       */
      return [...shows].sort(compareShowOrder);
    },

    async get(id) {
      const show = shows.find((candidate) => candidate.id === id);

      if (!show) return null;

      return {
        show,
        sessions: sessions.filter((session) => session.showId === id),
      };
    },

    async getBySessionId(sessionId) {
      const session = sessions.find((candidate) => candidate.id === sessionId);
      if (!session) return null;
      const show = shows.find((candidate) => candidate.id === session.showId);
      if (!show) return null;
      return { show, session };
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
