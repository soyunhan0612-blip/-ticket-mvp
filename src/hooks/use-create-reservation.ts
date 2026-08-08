"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";

import {
  myHeldSeatIdsAtom,
  myHoldExpiresAtAtom,
  selectedSeatIdsAtom,
} from "@/atoms/seat";
import { toastMessageAtom } from "@/atoms/toast";
import { SNAPSHOT_QUERY_KEY } from "@/hooks/use-seat-snapshot";

interface ReservationResponse {
  reservation: {
    id: string;
    sessionId: string;
    seatIds: string[];
    status: string;
    createdAt: number;
  };
}

export function useCreateReservation(
  sessionId: string,
): UseMutationResult<ReservationResponse, Error, void> {
  const queryClient = useQueryClient();
  const heldSeatIds = useAtomValue(myHeldSeatIdsAtom);
  const setSelected = useSetAtom(selectedSeatIdsAtom);
  const setMyHoldExpiresAt = useSetAtom(myHoldExpiresAtAtom);
  const setToast = useSetAtom(toastMessageAtom);

  return useMutation<ReservationResponse, Error, void>({
    mutationFn: async () => {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, seatIds: heldSeatIds }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (response.status === 403) throw new Error("다른 사용자의 좌석입니다.");
        if (response.status === 410) throw new Error("홀드가 만료되었습니다.");
        throw new Error(body.error ?? "예매에 실패했습니다.");
      }

      return (await response.json()) as ReservationResponse;
    },
    onSuccess: async () => {
      setSelected([]);
      setMyHoldExpiresAt(null);
      setToast({ text: "예매가 완료되었습니다!", type: "success" });
      await queryClient.invalidateQueries({
        queryKey: [SNAPSHOT_QUERY_KEY, sessionId],
      });
    },
    onError: (error) => {
      setToast({ text: error.message, type: "error" });
    },
  });
}
