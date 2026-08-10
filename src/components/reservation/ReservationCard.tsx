"use client";

import Link from "next/link";
import type { JSX } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <Card className={isCancelled ? "opacity-50" : ""}>
      <div className="flex items-start justify-between gap-lg">
        <div className="min-w-0 flex-1 space-y-sm">
          <div className="flex items-center gap-md">
            <h3 className="text-display-xs">#{id.slice(0, 8)}</h3>
            {/*
             * 배지가 아니라 텍스트다. 취소 상태는 카드 전체 명도로 표현하고
             * (UX_PRINCIPLES "명도만 낮춰 표시"), 라벨은 색 코딩하지 않는다.
             */}
            <span className="text-caption-upper uppercase text-body-aa">
              {isCancelled ? "취소됨" : "확정"}
            </span>
          </div>

          <p className="text-body-sm text-body-aa">{formatDate(createdAt)}</p>

          <Button
            className="!px-0"
            onClick={() => setExpanded((prev) => !prev)}
            size="sm"
            variant="text"
          >
            좌석 {seatIds.length}석 {expanded ? "접기" : "보기"}
          </Button>

          {expanded && (
            <p className="text-body-sm text-ink">{seatIds.join(", ")}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-sm">
          <Link
            className="rounded-sm text-body-sm text-body-aa transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            href={`/sessions/${sessionId}/seats`}
          >
            좌석 보기
          </Link>

          {/* 파괴 액션이라 primary와 물리적으로 분리하고 outline-red를 쓴다 */}
          {!isCancelled && (
            <Button
              disabled={mutation.isPending}
              onClick={handleCancel}
              size="sm"
              variant="outline-red"
            >
              {mutation.isPending ? "취소 중..." : "예매 취소"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
