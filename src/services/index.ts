import { createReservationStoreMemory } from "./reservation-store-memory";
import { createSeatStoreMemory } from "./seat-store-memory";
import { createShowStoreMemory } from "./show-store-memory";
import type { ReservationStore } from "./reservation-store";
import type { SeatStore } from "./seat-store";
import type { ShowStore } from "./show-store";

export type { ReservationStore } from "./reservation-store";
export type { SeatStore } from "./seat-store";
export type { ShowStore } from "./show-store";

let instance: ShowStore | null = null;
let seatInstance: SeatStore | null = null;
let reservationInstance: ReservationStore | null = null;

export function getShowStore(): ShowStore {
  if (!instance) instance = createShowStoreMemory();
  return instance;
}

export function getSeatStore(): SeatStore {
  if (!seatInstance) seatInstance = createSeatStoreMemory();
  return seatInstance;
}

export function getReservationStore(): ReservationStore {
  if (!reservationInstance) reservationInstance = createReservationStoreMemory(getSeatStore());
  return reservationInstance;
}
