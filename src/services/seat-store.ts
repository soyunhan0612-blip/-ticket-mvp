import type { Hold, SeatSnapshot } from "@/types";

export interface SeatStore {
  hold(
    sessionId: string,
    seatIds: string[],
    userId: string,
  ): Promise<Hold | { conflict: string[] }>;
  release(sessionId: string, seatIds: string[], userId: string): Promise<void>;
  getSnapshot(sessionId: string, userId: string): Promise<SeatSnapshot>;
}
