"use client";

import { useAtomValue } from "jotai";
import Link from "next/link";
import type { JSX } from "react";

import { myHeldSeatIdsAtom, myHoldExpiresAtAtom } from "@/atoms/seat";
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
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm leading-6 text-neutral-300">
            선택 좌석: {heldSeatIds.join(", ")}
          </p>
          {mutation.isSuccess && (
            <p className="text-sm leading-6 text-neutral-300">
              <Link
                className="text-white underline underline-offset-4 hover:text-neutral-200"
                href="/reservations"
              >
                예매 내역 보기
              </Link>
            </p>
          )}
        </div>

        <button
          className="rounded-md bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:bg-neutral-700 disabled:text-neutral-400"
          disabled={mutation.isPending || mutation.isSuccess}
          onClick={() => mutation.mutate()}
          type="button"
        >
          {mutation.isPending ? "처리 중..." : mutation.isSuccess ? "예매 완료" : "예매 확정"}
        </button>
      </div>
    </div>
  );
}
