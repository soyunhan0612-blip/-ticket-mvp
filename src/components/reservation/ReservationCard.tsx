"use client";

import Link from "next/link";
import type { JSX } from "react";
import { useState } from "react";

import { useCancelReservation } from "@/hooks/use-cancel-reservation";
import type { Reservation } from "@/types";

type ReservationCardProps = Omit<Reservation, "userId">;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReservationCard({
  id,
  sessionId,
  seatIds,
  status,
  createdAt,
}: ReservationCardProps): JSX.Element {
  const mutation = useCancelReservation();
  const [expanded, setExpanded] = useState(false);
  const isCancelled = status === "cancelled";

  const handleCancel = () => {
    if (window.confirm("정말 취소하시겠습니까?")) {
      mutation.mutate(id);
    }
  };

  return (
    <div
      className={`rounded-lg border border-neutral-800 bg-neutral-900 p-6${isCancelled ? " opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">
              #{id.slice(0, 8)}
            </h3>
            {isCancelled && (
              <span className="text-sm font-medium text-red-500">취소됨</span>
            )}
            {!isCancelled && (
              <span className="text-sm font-medium text-green-500">확정</span>
            )}
          </div>

          <p className="text-sm leading-6 text-neutral-400">
            {formatDate(createdAt)}
          </p>

          <button
            className="text-sm font-medium text-neutral-400 hover:text-white"
            onClick={() => setExpanded((prev) => !prev)}
            type="button"
          >
            좌석 {seatIds.length}석 {expanded ? "접기" : "보기"}
          </button>

          {expanded && (
            <p className="text-sm leading-6 text-neutral-300">
              {seatIds.join(", ")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Link
            className="text-sm text-neutral-400 hover:text-white"
            href={`/sessions/${sessionId}/seats`}
          >
            좌석 보기
          </Link>

          {!isCancelled && (
            <button
              className="rounded-sm px-1 py-1 text-sm font-medium text-red-500 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:text-neutral-500"
              disabled={mutation.isPending}
              onClick={handleCancel}
              type="button"
            >
              {mutation.isPending ? "취소 중..." : "예매 취소"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
