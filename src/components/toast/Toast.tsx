"use client";

import { useAtom } from "jotai";
import { useEffect, type JSX } from "react";

import { conflictSeatIdsAtom } from "@/atoms/seat";
import { toastMessageAtom } from "@/atoms/toast";

const TOAST_DURATION_MS = 5_000;

/*
 * 라이트 밴드와 다크 밴드 위에 모두 뜨므로 자체 표면을 갖는다.
 * 에러는 red 텍스트가 아니라 red 채움이다 — ink 위 red 텍스트는 3.08:1로 AA 미달이고,
 * 흰 글씨 위 red 배경은 4.81:1로 통과한다.
 */
const TOAST_CLASS_NAMES =
  "fixed inset-x-0 bottom-lg z-50 mx-auto w-fit max-w-[90vw] rounded-card px-lg py-md text-body-sm";
const ERROR_CLASS_NAMES = "bg-primary text-on-primary";
const SUCCESS_CLASS_NAMES = "bg-ink text-on-dark";

export function Toast(): JSX.Element | null {
  const [conflictSeatIds, setConflictSeatIds] = useAtom(conflictSeatIdsAtom);
  const [toastMessage, setToastMessage] = useAtom(toastMessageAtom);

  useEffect(() => {
    if (conflictSeatIds.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setConflictSeatIds([]);
    }, TOAST_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [conflictSeatIds, setConflictSeatIds]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, TOAST_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage, setToastMessage]);

  if (conflictSeatIds.length > 0) {
    return (
      <p className={`${TOAST_CLASS_NAMES} ${ERROR_CLASS_NAMES}`} role="alert">
        좌석 {conflictSeatIds.join(", ")}이(가) 이미 선택되었습니다
      </p>
    );
  }

  if (toastMessage) {
    const isSuccess = toastMessage.type === "success";

    return (
      <p
        className={`${TOAST_CLASS_NAMES} ${isSuccess ? SUCCESS_CLASS_NAMES : ERROR_CLASS_NAMES}`}
        role={isSuccess ? "status" : "alert"}
      >
        {toastMessage.text}
      </p>
    );
  }

  return null;
}
