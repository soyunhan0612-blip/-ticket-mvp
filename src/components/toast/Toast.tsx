"use client";

import { useAtom } from "jotai";
import { useEffect, type JSX } from "react";

import { conflictSeatIdsAtom } from "@/atoms/seat";

const TOAST_DURATION_MS = 5_000;

export function Toast(): JSX.Element | null {
  const [conflictSeatIds, setConflictSeatIds] = useAtom(conflictSeatIdsAtom);

  useEffect(() => {
    if (conflictSeatIds.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setConflictSeatIds([]);
    }, TOAST_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [conflictSeatIds, setConflictSeatIds]);

  if (conflictSeatIds.length === 0) {
    return null;
  }

  return (
    <p
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit rounded-md bg-neutral-900 px-4 py-3 text-sm leading-6 text-red-500"
      role="alert"
    >
      좌석 {conflictSeatIds.join(", ")}이(가) 이미 선택되었습니다
    </p>
  );
}
