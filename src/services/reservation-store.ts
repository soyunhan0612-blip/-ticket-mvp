import type { Reservation } from "@/types";

export interface ReservationStore {
  create(sessionId: string, seatIds: string[], userId: string): Promise<Reservation>;
  listByUser(userId: string): Promise<Reservation[]>;
  cancel(reservationId: string, userId: string): Promise<Reservation>;
}
