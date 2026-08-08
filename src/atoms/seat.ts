import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

import { canSelect, MAX_SEATS_PER_HOLD } from "@/lib/seat-rules";
import type { SeatSnapshot, SeatSnapshotEntry, SeatVisualState } from "@/types";

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

    const serverStatus = get(seatStatusAtomFamily(seatId));
    if (
      serverStatus !== null &&
      !(serverStatus.s === "held" && serverStatus.mine)
    ) {
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

export const snapshotVersionAtom = atom<number>(0);

export const myHoldExpiresAtAtom = atom<number | null>(null);

export const serverNowAtom = atom<number>(0);

export const trackedSeatIdsAtom = atom<Set<string>>(new Set());

export const syncSnapshotAtom = atom(
  null,
  (get, set, snapshot: SeatSnapshot) => {
    if (snapshot.version === get(snapshotVersionAtom)) {
      return;
    }

    set(snapshotVersionAtom, snapshot.version);
    set(serverNowAtom, snapshot.serverNow);

    const previousSeatIds = get(trackedSeatIdsAtom);
    const currentSeatIds = new Set(Object.keys(snapshot.seats));
    let myHoldExpiresAt: number | null = null;

    for (const [seatId, status] of Object.entries(snapshot.seats)) {
      set(seatStatusAtomFamily(seatId), status);

      if (
        status.s === "held" &&
        status.mine === true &&
        status.expiresAt !== undefined
      ) {
        myHoldExpiresAt = status.expiresAt;
      }
    }

    for (const seatId of previousSeatIds) {
      if (!currentSeatIds.has(seatId)) {
        set(seatStatusAtomFamily(seatId), null);
      }
    }

    set(trackedSeatIdsAtom, currentSeatIds);
    set(myHoldExpiresAtAtom, myHoldExpiresAt);
  },
);
