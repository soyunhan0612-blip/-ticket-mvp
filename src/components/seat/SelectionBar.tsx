"use client";

import { useAtomValue, useSetAtom } from "jotai";
import type { JSX } from "react";

import { conflictSeatIdsAtom, selectedSeatIdsAtom } from "@/atoms/seat";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  const setConflictSeatIds = useSetAtom(conflictSeatIdsAtom);
  const holdMutation = useHoldMutation(sessionId);

  async function completeSelection(): Promise<void> {
    const validation = validateSelection(selected);

    if (!validation.ok) {
      return;
    }

    try {
      const result = await holdMutation.mutateAsync(selected);

      if (!result.success) {
        setConflictSeatIds(result.conflict ?? []);
      }
    } catch {
      // 네트워크 오류 롤백은 useHoldMutation에서 처리한다.
    }
  }

  if (selected.length === 0) {
    return null;
  }

  return (
    <Card tone="dark">
      <div className="flex flex-wrap items-start justify-between gap-lg">
        <div className="space-y-md">
          <p className="text-body-sm">
            선택 좌석 {selected.length} / {MAX_SEATS_PER_HOLD}
          </p>
          <ul className="flex flex-wrap gap-sm text-body-sm text-mute">
            {selected.map((seatId) => (
              <li key={seatId}>{seatId}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-lg">
          <Button
            disabled={holdMutation.isPending}
            onClick={completeSelection}
            size="sm"
          >
            {holdMutation.isPending ? "처리 중..." : "선택 완료"}
          </Button>
          <Button
            onClick={() => setSelected([])}
            size="sm"
            variant="text-on-dark"
          >
            초기화
          </Button>
        </div>
      </div>
    </Card>
  );
}
