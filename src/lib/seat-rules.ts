import { isValidSeatId } from "./seat-map";

export const MAX_SEATS_PER_HOLD = 4;

export type SelectionValidation =
  | { ok: true }
  | {
      ok: false;
      reason: "empty" | "over-limit" | "duplicate" | "invalid-seat-id";
    };

export function canSelect(
  currentSelected: readonly string[],
  seatId: string,
): boolean {
  if (!isValidSeatId(seatId)) {
    return false;
  }

  if (currentSelected.includes(seatId)) {
    return false;
  }

  return currentSelected.length < MAX_SEATS_PER_HOLD;
}

export function validateSelection(
  seatIds: readonly string[],
): SelectionValidation {
  if (seatIds.length === 0) {
    return { ok: false, reason: "empty" };
  }

  if (seatIds.length > MAX_SEATS_PER_HOLD) {
    return { ok: false, reason: "over-limit" };
  }

  if (new Set(seatIds).size !== seatIds.length) {
    return { ok: false, reason: "duplicate" };
  }

  if (seatIds.some((seatId) => !isValidSeatId(seatId))) {
    return { ok: false, reason: "invalid-seat-id" };
  }

  return { ok: true };
}
