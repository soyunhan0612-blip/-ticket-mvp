import type { Session, Show } from "@/types";

export interface ShowStore {
  list(): Promise<Show[]>;
  get(id: string): Promise<{ show: Show; sessions: Session[] } | null>;
  getBySessionId(
    sessionId: string,
  ): Promise<{ show: Show; session: Session } | null>;
  create(input: unknown): Promise<{ show: Show; sessions: Session[] }>;
}
