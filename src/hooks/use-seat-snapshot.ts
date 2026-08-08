"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

import { syncSnapshotAtom } from "@/atoms/seat";
import type { SeatSnapshot } from "@/types";

export const SNAPSHOT_QUERY_KEY = "snapshot" as const;
export const SNAPSHOT_REFETCH_INTERVAL = 3_000;

export function useSeatSnapshot(
  sessionId: string,
): UseQueryResult<SeatSnapshot> {
  const syncSnapshot = useSetAtom(syncSnapshotAtom);
  const query = useQuery<SeatSnapshot>({
    queryKey: [SNAPSHOT_QUERY_KEY, sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}/snapshot`);

      if (!response.ok) {
        throw new Error("좌석 스냅샷을 불러오지 못했습니다.");
      }

      return (await response.json()) as SeatSnapshot;
    },
    refetchInterval: SNAPSHOT_REFETCH_INTERVAL,
  });

  useEffect(() => {
    if (query.data) {
      syncSnapshot(query.data);
    }
    // serverNow changes on every poll; synchronize only when the snapshot version changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.version, syncSnapshot]);

  return query;
}
