"use client";

import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { useMemo, useState } from "react";

import { AdminSeatMap } from "@/components/admin/AdminSeatMap";
import { OccupancyStats } from "@/components/admin/OccupancyStats";
import { generateSeats } from "@/lib/mock-data";
import { SECTIONS } from "@/lib/seat-map";
import { generateSeatsForPreset, getPreset } from "@/lib/seat-preset";
import type { Session, Show } from "@/types";

interface ShowsResponse {
  shows: Show[];
}

interface ShowDetailResponse {
  show: Show;
  sessions: Session[];
}

async function fetchJson<T>(url: string, message: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(message);
  return (await response.json()) as T;
}

export default function AdminPage(): JSX.Element {
  const [showId, setShowId] = useState("");
  const [sessionId, setSessionId] = useState("");

  const showsQuery = useQuery<ShowsResponse>({
    queryKey: ["shows"],
    queryFn: () => fetchJson("/api/shows", "공연 목록을 불러오지 못했습니다."),
  });
  const detailQuery = useQuery<ShowDetailResponse>({
    queryKey: ["show", showId],
    queryFn: () =>
      fetchJson(
        `/api/shows/${encodeURIComponent(showId)}`,
        "회차 목록을 불러오지 못했습니다.",
      ),
    enabled: showId !== "",
  });

  const selectedShow = detailQuery.data?.show;
  // Seeded shows carry no presetId, so fall back to the full map exactly as the
  // viewer seat page does — and as /api/admin/stats does for its total.
  const presetId = selectedShow?.presetId;
  const seats = useMemo(
    () => (presetId ? generateSeatsForPreset(presetId) : generateSeats()),
    [presetId],
  );
  const sections = useMemo(
    () => (presetId ? getPreset(presetId).sections : SECTIONS),
    [presetId],
  );
  const canShowDashboard = sessionId !== "" && selectedShow !== undefined;

  return (
    <main className="min-h-screen bg-neutral-950 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            실시간 점유 현황
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            공연과 회차를 선택해 좌석 상태를 확인하세요.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-neutral-300"
              htmlFor="admin-show"
            >
              공연
            </label>
            <select
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100 focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:border-neutral-800 disabled:text-neutral-500"
              disabled={showsQuery.isLoading || showsQuery.isError}
              id="admin-show"
              onChange={(event) => {
                setShowId(event.target.value);
                setSessionId("");
              }}
              value={showId}
            >
              <option value="">공연 선택</option>
              {showsQuery.data?.shows.map((show) => (
                <option key={show.id} value={show.id}>
                  {show.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-neutral-300"
              htmlFor="admin-session"
            >
              회차
            </label>
            <select
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100 focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:border-neutral-800 disabled:text-neutral-500"
              disabled={!detailQuery.data || detailQuery.isLoading}
              id="admin-session"
              onChange={(event) => setSessionId(event.target.value)}
              value={sessionId}
            >
              <option value="">회차 선택</option>
              {detailQuery.data?.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {new Date(session.startsAt).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(showsQuery.isError || detailQuery.isError) && (
          <p className="text-sm leading-6 text-red-500">
            공연 또는 회차 목록을 불러오지 못했습니다.
          </p>
        )}

        {canShowDashboard && (
          <div className="space-y-8">
            <OccupancyStats sessionId={sessionId} />
            <AdminSeatMap
              seats={seats}
              sections={sections}
              sessionId={sessionId}
            />
          </div>
        )}
      </div>
    </main>
  );
}
