import type { Session, Show } from "@/types";

export interface ShowStore {
  list(): Promise<Show[]>;
  get(id: string): Promise<{ show: Show; sessions: Session[] } | null>;
  create(input: unknown): Promise<{ show: Show; sessions: Session[] }>;
}
