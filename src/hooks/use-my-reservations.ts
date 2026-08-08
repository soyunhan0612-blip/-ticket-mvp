"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { RESERVATIONS_QUERY_KEY } from "@/hooks/use-cancel-reservation";
import type { Reservation } from "@/types";

type ReservationWithoutUserId = Omit<Reservation, "userId">;

export function useMyReservations(): UseQueryResult<ReservationWithoutUserId[]> {
  return useQuery<ReservationWithoutUserId[]>({
    queryKey: [RESERVATIONS_QUERY_KEY],
    queryFn: async () => {
      const response = await fetch("/api/reservations");

      if (!response.ok) {
        throw new Error("예매 목록을 불러오지 못했습니다.");
      }

      const body = (await response.json()) as { reservations: ReservationWithoutUserId[] };
      return body.reservations;
    },
  });
}
