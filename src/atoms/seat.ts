import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

import { canSelect, MAX_SEATS_PER_HOLD } from "@/lib/seat-rules";
import type { SeatSnapshotEntry, SeatVisualState } from "@/types";

export const seatStatusAtomFamily = atomFamily((_seatId: string) =>
  atom<SeatSnapshotEntry | null>(null),
);

export const selectedSeatIdsAtom = atom<string[]>([]);

export const toggleSeatAtom = atom(
  null,
  (get, set, seatId: string) => {
    const selectedSeatIds = get(selectedSeatIdsAtom);

    if (selectedSeatIds.includes(seatId)) {
      set(
        selectedSeatIdsAtom,
        selectedSeatIds.filter((selectedSeatId) => selectedSeatId !== seatId),
      );
      return;
    }

    if (
      selectedSeatIds.length < MAX_SEATS_PER_HOLD &&
      canSelect(selectedSeatIds, seatId)
    ) {
      set(selectedSeatIdsAtom, [...selectedSeatIds, seatId]);
    }
  },
);

export const seatVisualStateAtomFamily = atomFamily((seatId: string) =>
  atom<SeatVisualState>((get) => {
    const status = get(seatStatusAtomFamily(seatId));
    const selectedSeatIds = get(selectedSeatIdsAtom);

    if (selectedSeatIds.includes(seatId)) {
      return "selected";
    }

    if (status === null) {
      return "available";
    }

    if (status.s === "held") {
      return status.mine ? "selected" : "held-other";
    }

    if (status.s === "sold") {
      return "sold";
    }

    return "available";
  }),
);
