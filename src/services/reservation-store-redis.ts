import type { Reservation } from "@/types";

import { getRedisClient } from "./redis-client";
import type { ReservationStore } from "./reservation-store";
import type { SeatStore } from "./seat-store";

const RESERVATIONS_KEY = "reservations";

const CREATE_RESERVATION_SCRIPT = `
-- operation: create-reservation
redis.call("HSET", KEYS[1], ARGV[1], ARGV[2])
redis.call("SADD", KEYS[2], ARGV[1])
return 1
`;

function userReservationsKey(userId: string): string {
  return `user:${userId}:reservations`;
}

function parseReservation(value: unknown): Reservation {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid Redis reservation entry");
  }
  return parsed as Reservation;
}

export function createReservationStoreRedis(seatStore: SeatStore): ReservationStore {
  const redis = getRedisClient();

  return {
    async create(sessionId, seatIds, userId) {
      // SeatStore performs an all-or-nothing ownership and expiry check before changing seats.
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
        // Keep the record and its direct user index in one Redis operation.
        await redis.eval(
          CREATE_RESERVATION_SCRIPT,
          [RESERVATIONS_KEY, userReservationsKey(userId)],
          [reservation.id, JSON.stringify(reservation)],
        );
      } catch (error) {
        await seatStore.revertSold(sessionId, seatIds);
        throw error;
      }

      return reservation;
    },

    async listByUser(userId) {
      const reservationIds = await redis.smembers(userReservationsKey(userId));
      if (reservationIds.length === 0) return [];

      // One batched read instead of one per id; hmget returns a field-keyed object.
      const values = await redis.hmget<Record<string, unknown>>(
        RESERVATIONS_KEY,
        ...reservationIds,
      );
      if (values === null) return [];

      return reservationIds
        .map((reservationId) => values[reservationId])
        .filter((value) => value !== null && value !== undefined)
        .map(parseReservation)
        .filter((reservation) => reservation.userId === userId);
    },

    async cancel(reservationId, userId) {
      const rawReservation = await redis.hget<unknown>(RESERVATIONS_KEY, reservationId);
      if (rawReservation === null) {
        throw new Error(`NOT_FOUND: reservation ${reservationId} does not exist`);
      }

      const reservation = parseReservation(rawReservation);
      if (reservation.userId !== userId) {
        throw new Error(`FORBIDDEN: reservation ${reservationId} is owned by another user`);
      }
      if (reservation.status === "cancelled") {
        throw new Error(`ALREADY_CANCELLED: reservation ${reservationId} is already cancelled`);
      }

      await seatStore.releaseSold(reservation.sessionId, reservation.seatIds, userId);
      const cancelled: Reservation = { ...reservation, status: "cancelled" };
      await redis.hset(RESERVATIONS_KEY, {
        [reservationId]: JSON.stringify(cancelled),
      });
      return cancelled;
    },
  };
}
