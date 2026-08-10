"use client";

import { useAtomValue } from "jotai";
import Link from "next/link";
import type { JSX } from "react";

import { myHeldSeatIdsAtom, myHoldExpiresAtAtom } from "@/atoms/seat";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCreateReservation } from "@/hooks/use-create-reservation";

interface ConfirmBarProps {
  sessionId: string;
}

export function ConfirmBar({ sessionId }: ConfirmBarProps): JSX.Element | null {
  const expiresAt = useAtomValue(myHoldExpiresAtAtom);
  const heldSeatIds = useAtomValue(myHeldSeatIdsAtom);
  const mutation = useCreateReservation(sessionId);

  if (expiresAt === null) {
    return null;
  }

  return (
    <Card tone="dark">
      <div className="flex flex-wrap items-start justify-between gap-lg">
        <div className="space-y-sm">
          <p className="text-body-sm">선택 좌석: {heldSeatIds.join(", ")}</p>
          {mutation.isSuccess && (
            <p className="text-body-sm">
              <Link
                className="rounded-sm underline underline-offset-4 transition-colors duration-150 hover:text-mute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                href="/reservations"
              >
                예매 내역 보기
              </Link>
            </p>
          )}
        </div>

        <Button
          disabled={mutation.isPending || mutation.isSuccess}
          onClick={() => mutation.mutate()}
          size="sm"
        >
          {mutation.isPending
            ? "처리 중..."
            : mutation.isSuccess
              ? "예매 완료"
              : "예매 확정"}
        </Button>
      </div>
    </Card>
  );
}
