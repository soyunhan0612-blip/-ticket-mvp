"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useStore } from "jotai";

import {
  myHoldExpiresAtAtom,
  seatStatusAtomFamily,
  selectedSeatIdsAtom,
} from "@/atoms/seat";
import { createExpiresAt } from "@/lib/hold";
import type { SeatSnapshotEntry } from "@/types";
import { SNAPSHOT_QUERY_KEY } from "@/hooks/use-seat-snapshot";

export interface HoldMutationResult {
  success: boolean;
  conflict?: string[];
}

interface HoldMutationContext {
  previousExpiresAt: number | null;
  previousSeatIds: string[];
  previousStatuses: Map<string, SeatSnapshotEntry | null>;
}

interface ConflictResponse {
  conflict?: string[];
}

export function useHoldMutation(
  sessionId: string,
): UseMutationResult<
  HoldMutationResult,
  Error,
  string[],
  HoldMutationContext
> {
  const queryClient = useQueryClient();
  const store = useStore();

  const rollback = (context: HoldMutationContext | undefined) => {
    if (!context) {
      return;
    }

    for (const [seatId, status] of context.previousStatuses) {
      store.set(seatStatusAtomFamily(seatId), status);
    }
    store.set(selectedSeatIdsAtom, context.previousSeatIds);
    store.set(myHoldExpiresAtAtom, context.previousExpiresAt);
  };

  return useMutation<
    HoldMutationResult,
    Error,
    string[],
    HoldMutationContext
  >({
    mutationFn: async (seatIds) => {
      const response = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, seatIds }),
      });

      if (response.status === 409) {
        const body = (await response.json()) as ConflictResponse;
        return { success: false, conflict: body.conflict ?? [] };
      }

      if (response.ok) {
        return { success: true };
      }

      throw new Error("좌석을 잡지 못했습니다.");
    },
    onMutate: async (seatIds) => {
      await queryClient.cancelQueries({
        queryKey: [SNAPSHOT_QUERY_KEY, sessionId],
      });

      const previousStatuses = new Map(
        seatIds.map((seatId) => [
          seatId,
          store.get(seatStatusAtomFamily(seatId)),
        ]),
      );
      const previousSeatIds = store.get(selectedSeatIdsAtom);
      const previousExpiresAt = store.get(myHoldExpiresAtAtom);
      const expiresAt = createExpiresAt();

      for (const seatId of seatIds) {
        store.set(seatStatusAtomFamily(seatId), {
          s: "held",
          mine: true,
          expiresAt,
        });
      }
      store.set(selectedSeatIdsAtom, []);
      store.set(myHoldExpiresAtAtom, expiresAt);

      return { previousExpiresAt, previousSeatIds, previousStatuses };
    },
    onSuccess: async (result, _seatIds, context) => {
      if (!result.success) {
        rollback(context);
      }

      await queryClient.invalidateQueries({
        queryKey: [SNAPSHOT_QUERY_KEY, sessionId],
      });
    },
    onError: (_error, _seatIds, context) => {
      rollback(context);
    },
  });
}
