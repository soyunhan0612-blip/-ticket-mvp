"use client";

import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";

import { SNAPSHOT_REFETCH_INTERVAL } from "@/hooks/use-seat-snapshot";

interface OccupancyStatsProps {
  sessionId: string;
}

interface OccupancyStatsResponse {
  total: number;
  available: number;
  held: number;
  sold: number;
  version: number;
  serverNow: number;
}

const CARDS = [
  ["전체", "total"],
  ["예매가능", "available"],
  ["홀드중", "held"],
  ["판매완료", "sold"],
] as const;

export function OccupancyStats({
  sessionId,
}: OccupancyStatsProps): JSX.Element {
  const { data, isLoading, isError } = useQuery<OccupancyStatsResponse>({
    queryKey: ["admin-stats", sessionId],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/stats?sessionId=${encodeURIComponent(sessionId)}`,
      );
      if (!response.ok) {
        throw new Error("점유 현황을 불러오지 못했습니다.");
      }
      return (await response.json()) as OccupancyStatsResponse;
    },
    refetchInterval: SNAPSHOT_REFETCH_INTERVAL,
  });

  if (isLoading) {
    return <p className="text-sm leading-6 text-neutral-400">집계 중...</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-sm leading-6 text-red-500">
        점유 현황을 불러오지 못했습니다.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map(([label, key]) => (
        <section
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 transition-colors duration-150 hover:border-neutral-700"
          key={key}
        >
          <p className="text-sm leading-6 text-neutral-400">{label}</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {data[key].toLocaleString("ko-KR")}
          </p>
        </section>
      ))}
    </div>
  );
}
