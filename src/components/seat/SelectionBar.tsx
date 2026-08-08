"use client";

import { useAtomValue, useSetAtom } from "jotai";
import type { JSX } from "react";

import { selectedSeatIdsAtom } from "@/atoms/seat";
import {
  MAX_SEATS_PER_HOLD,
  validateSelection,
} from "@/lib/seat-rules";

export function SelectionBar(): JSX.Element | null {
  const selected = useAtomValue(selectedSeatIdsAtom);
  const setSelected = useSetAtom(selectedSeatIdsAtom);

  function completeSelection(): void {
    const validation = validateSelection(selected);

    if (validation.ok) {
      alert(JSON.stringify(selected));
      return;
    }

    alert(`선택 오류: ${validation.reason}`);
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
          <button
            className="rounded-md bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:bg-neutral-700 disabled:text-neutral-400"
            onClick={completeSelection}
            type="button"
          >
            선택 완료
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
