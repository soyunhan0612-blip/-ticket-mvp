export interface Show {
  id: string;
  title: string;
  description: string;
  posterUrl?: string;
}

export interface Session {
  id: string;
  showId: string;
  startsAt: string;
}

export interface Seat {
  id: string;
  section: string;
  row: number;
  col: number;
}

export type SeatStatus = "available" | "held" | "sold";

export type SeatVisualState =
  | "available"
  | "selected"
  | "held-other"
  | "sold";

export interface Hold {
  sessionId: string;
  seatIds: string[];
  userId: string;
  expiresAt: number;
}

export interface Reservation {
  id: string;
  sessionId: string;
  seatIds: string[];
  userId: string;
  status: "confirmed" | "cancelled";
  createdAt: number;
}

export interface SeatSnapshotEntry {
  s: "held" | "sold";
  mine?: boolean;
  expiresAt?: number;
}

export interface SeatSnapshot {
  version: number;
  serverNow: number;
  seats: Record<string, SeatSnapshotEntry>;
}
