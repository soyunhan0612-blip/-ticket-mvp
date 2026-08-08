import type { Reservation } from "@/types";

import type { ReservationStore } from "./reservation-store";
import type { SeatStore } from "./seat-store";

const globalForReservationStore = globalThis as typeof globalThis & {
  reservationStoreMemory?: ReservationStore;
};

function makeReservationStoreMemory(seatStore: SeatStore): ReservationStore {
  const reservations = new Map<string, Reservation>();

  return {
    async create(sessionId, seatIds, userId) {
      // confirmSeats throws FORBIDDEN/EXPIRED if validation fails — no seat changes in that case
      await seatStore.confirmSeats(sessionId, seatIds, userId);

      const reservation: Reservation = {
        id: crypto.randomUUID(),
        sessionId,
        seatIds: [...seatIds],
        userId,
        status: "confirmed",
        createdAt: Date.now(),
      };

      try {
        reservations.set(reservation.id, reservation);
      } catch (error) {
        // Rollback sold seats if record creation fails
        await seatStore.revertSold(sessionId, seatIds);
        throw error;
      }

      return reservation;
    },

    async listByUser(userId) {
      return [...reservations.values()].filter((r) => r.userId === userId);
    },

    async cancel(reservationId, userId) {
      const reservation = reservations.get(reservationId);
      if (!reservation) {
        throw new Error(`NOT_FOUND: reservation ${reservationId} does not exist`);
      }
      if (reservation.userId !== userId) {
        throw new Error(`FORBIDDEN: reservation ${reservationId} is owned by another user`);
      }
      if (reservation.status === "cancelled") {
        throw new Error(`ALREADY_CANCELLED: reservation ${reservationId} is already cancelled`);
      }

      await seatStore.releaseSold(reservation.sessionId, reservation.seatIds, userId);
      reservation.status = "cancelled";

      return reservation;
    },
  };
}

export function createReservationStoreMemory(seatStore: SeatStore): ReservationStore {
  globalForReservationStore.reservationStoreMemory ??= makeReservationStoreMemory(seatStore);
  return globalForReservationStore.reservationStoreMemory;
}
