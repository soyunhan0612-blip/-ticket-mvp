import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

import { canSelect, MAX_SEATS_PER_HOLD } from "@/lib/seat-rules";
import type { SeatSnapshot, SeatSnapshotEntry, SeatVisualState } from "@/types";

export const seatStatusAtomFamily = atomFamily((_seatId: string) =>
  atom<SeatSnapshotEntry | null>(null),
);

export const selectedSeatIdsAtom = atom<string[]>([]);

export const seatMapReadOnlyAtom = atom(false);

// 충돌 좌석 ID 목록 (409 수신 후 일시적 표시용)
export const conflictSeatIdsAtom = atom<string[]>([]);

export const toggleSeatAtom = atom(
  null,
  (get, set, seatId: string) => {
    if (get(seatMapReadOnlyAtom)) {
      return;
    }

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
    const readOnly = get(seatMapReadOnlyAtom);

    if (!readOnly && selectedSeatIds.includes(seatId)) {
      return "selected";
    }

    if (status === null) {
      return "available";
    }

    if (status.s === "held") {
      return !readOnly && status.mine ? "selected" : "held-other";
    }

    if (status.s === "sold") {
      return "sold";
    }

    return "available";
  }),
);

export const myHeldSeatIdsAtom = atom<string[]>((get) => {
  const trackedIds = get(trackedSeatIdsAtom);
  const result: string[] = [];
  for (const seatId of trackedIds) {
    const status = get(seatStatusAtomFamily(seatId));
    if (status !== null && status.s === "held" && status.mine === true) {
      result.push(seatId);
    }
  }
  return result;
});

// `null` means "never synced" — a session's first snapshot legitimately reports
// version 0, so 0 cannot double as the unset sentinel.
export const snapshotVersionAtom = atom<number | null>(null);

export const syncedSessionIdAtom = atom<string | null>(null);

export const myHoldExpiresAtAtom = atom<number | null>(null);

export const serverNowAtom = atom<number>(0);

export const trackedSeatIdsAtom = atom<Set<string>>(new Set<string>());

export interface SyncSnapshotPayload {
  sessionId: string;
  snapshot: SeatSnapshot;
}

export const syncSnapshotAtom = atom(
  null,
  (get, set, { sessionId, snapshot }: SyncSnapshotPayload) => {
    // Version counters restart per session, so the version alone cannot tell a
    // poll of the same session apart from a switch to a different one.
    const sameSession = get(syncedSessionIdAtom) === sessionId;
    if (sameSession && snapshot.version === get(snapshotVersionAtom)) {
      return;
    }

    if (!sameSession) {
      set(selectedSeatIdsAtom, []);
      set(conflictSeatIdsAtom, []);
    }

    set(syncedSessionIdAtom, sessionId);
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
