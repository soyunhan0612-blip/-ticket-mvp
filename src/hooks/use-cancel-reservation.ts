"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useSetAtom } from "jotai";

import { toastMessageAtom } from "@/atoms/toast";

export const RESERVATIONS_QUERY_KEY = "reservations" as const;

interface CancelResponse {
  reservation: {
    id: string;
    sessionId: string;
    seatIds: string[];
    status: string;
    createdAt: number;
  };
}

export function useCancelReservation(): UseMutationResult<CancelResponse, Error, string> {
  const queryClient = useQueryClient();
  const setToast = useSetAtom(toastMessageAtom);

  return useMutation<CancelResponse, Error, string>({
    mutationFn: async (reservationId) => {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "예매 취소에 실패했습니다.");
      }

      return (await response.json()) as CancelResponse;
    },
    onSuccess: async () => {
      setToast({ text: "예매가 취소되었습니다.", type: "success" });
      await queryClient.invalidateQueries({
        queryKey: [RESERVATIONS_QUERY_KEY],
      });
    },
    onError: (error) => {
      setToast({ text: error.message, type: "error" });
    },
  });
}
