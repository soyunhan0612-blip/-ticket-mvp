"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useState, type JSX } from "react";

import { selectedSeatIdsAtom } from "@/atoms/seat";
import { useHoldMutation } from "@/hooks/use-hold-mutation";
import {
  MAX_SEATS_PER_HOLD,
  validateSelection,
} from "@/lib/seat-rules";

interface SelectionBarProps {
  sessionId: string;
}

export function SelectionBar({ sessionId }: SelectionBarProps): JSX.Element | null {
  const selected = useAtomValue(selectedSeatIdsAtom);
  const setSelected = useSetAtom(selectedSeatIdsAtom);
  const holdMutation = useHoldMutation(sessionId);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  async function completeSelection(): Promise<void> {
    const validation = validateSelection(selected);

    if (!validation.ok) {
      return;
    }

    setConflictMessage(null);

    try {
      const result = await holdMutation.mutateAsync(selected);

      if (!result.success) {
        setConflictMessage(
          result.conflict?.length
            ? `이미 선택된 좌석: ${result.conflict.join(", ")}`
            : "선택한 좌석을 잡을 수 없습니다.",
        );
      }
    } catch {
      // 네트워크 오류 롤백은 useHoldMutation에서 처리한다.
    }
  }

  if (selected.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 transition-colors duration-150 hover:border-neutral-700">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-neutral-300">
            선택 좌석 {selected.length} / {MAX_SEATS_PER_HOLD}
          </p>
          <ul className="flex flex-wrap gap-2 text-sm leading-6 text-neutral-400">
            {selected.map((seatId) => (
              <li key={seatId}>{seatId}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {conflictMessage ? (
            <p className="text-sm leading-6 text-red-500" role="alert">
              {conflictMessage}
            </p>
          ) : null}
          <button
            className="rounded-md bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:bg-neutral-700 disabled:text-neutral-400"
            disabled={holdMutation.isPending}
            onClick={completeSelection}
            type="button"
          >
            {holdMutation.isPending ? "처리 중..." : "선택 완료"}
          </button>
          <button
            className="rounded-sm px-1 py-1 text-sm font-medium text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:text-neutral-600"
            onClick={() => setSelected([])}
            type="button"
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
