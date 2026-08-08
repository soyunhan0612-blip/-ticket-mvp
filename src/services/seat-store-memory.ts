import { createExpiresAt, isExpired } from "@/lib/hold";
import type { SeatSnapshotEntry } from "@/types";

import type { SeatStore } from "./seat-store";

interface HoldEntry {
  userId: string;
  expiresAt: number;
  status: "held" | "sold";
}

interface SessionState {
  seats: Map<string, HoldEntry>;
  version: number;
}

const globalForSeatStore = globalThis as typeof globalThis & {
  seatStoreMemory?: SeatStore;
};

function makeSeatStoreMemory(): SeatStore {
  const sessions = new Map<string, SessionState>();

  function getSession(sessionId: string): SessionState {
    let session = sessions.get(sessionId);

    if (!session) {
      session = { seats: new Map(), version: 0 };
      sessions.set(sessionId, session);
    }

    return session;
  }

  return {
    async hold(sessionId, seatIds, userId) {
      const session = getSession(sessionId);
      let removedExpired = false;

      for (const seatId of seatIds) {
        const entry = session.seats.get(seatId);
        if (entry?.status === "held" && isExpired(entry.expiresAt)) {
          session.seats.delete(seatId);
          removedExpired = true;
        }
      }

      const conflict = seatIds.filter((seatId) => {
        const entry = session.seats.get(seatId);
        return entry !== undefined && (entry.status === "sold" || entry.userId !== userId);
      });

      if (conflict.length > 0) {
        if (removedExpired) session.version += 1;
        return { conflict };
      }

      const expiresAt = createExpiresAt();
      for (const seatId of seatIds) {
        session.seats.set(seatId, { userId, expiresAt, status: "held" });
      }
      session.version += 1;

      return {
        id: crypto.randomUUID(),
        sessionId,
        seatIds: [...seatIds],
        userId,
        expiresAt,
      };
    },

    async release(sessionId, seatIds, userId) {
      const session = getSession(sessionId);

      for (const seatId of seatIds) {
        const entry = session.seats.get(seatId);
        if (entry?.status === "held" && isExpired(entry.expiresAt)) continue;
        if (entry && entry.userId !== userId) {
          throw new Error(`FORBIDDEN: seat ${seatId} is owned by another user`);
        }
      }

      for (const seatId of seatIds) {
        const entry = session.seats.get(seatId);
        if (!entry || (entry.status === "held" && isExpired(entry.expiresAt))) {
          session.seats.delete(seatId);
          continue;
        }
        session.seats.delete(seatId);
      }
      session.version += 1;
    },

    async getSnapshot(sessionId, userId) {
      const session = getSession(sessionId);
      const serverNow = Date.now();
      let removedExpired = false;

      for (const [seatId, entry] of session.seats) {
        if (entry.status === "held" && isExpired(entry.expiresAt, serverNow)) {
          session.seats.delete(seatId);
          removedExpired = true;
        }
      }
      if (removedExpired) session.version += 1;

      const seats: Record<string, SeatSnapshotEntry> = {};
      for (const [seatId, entry] of session.seats) {
        seats[seatId] = {
          s: entry.status,
          ...(entry.userId === userId ? { mine: true } : {}),
          ...(entry.status === "held" ? { expiresAt: entry.expiresAt } : {}),
        };
      }

      return { version: session.version, serverNow, seats };
    },
  };
}

export function createSeatStoreMemory(): SeatStore {
  globalForSeatStore.seatStoreMemory ??= makeSeatStoreMemory();
  return globalForSeatStore.seatStoreMemory;
}
