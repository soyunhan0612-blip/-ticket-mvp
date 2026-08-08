"use client";

import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState, type JSX } from "react";

import { myHoldExpiresAtAtom, serverNowAtom } from "@/atoms/seat";

export function HoldTimer(): JSX.Element | null {
  const expiresAt = useAtomValue(myHoldExpiresAtAtom);
  const serverNow = useAtomValue(serverNowAtom);
  const [now, setNow] = useState(() => Date.now());
  const clockDrift = useMemo(
    () => (serverNow === 0 ? 0 : Date.now() - serverNow),
    [serverNow],
  );

  useEffect(() => {
    setNow(Date.now());

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [expiresAt, serverNow]);

  if (expiresAt === null || serverNow === 0) {
    return null;
  }

  const clientExpiresAt = expiresAt + clockDrift;
  const remainingSeconds = Math.max(
    0,
    Math.ceil((clientExpiresAt - now) / 1_000),
  );

  if (remainingSeconds <= 0) {
    return null;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <div className="mt-4 rounded-lg bg-neutral-900 p-4 text-sm text-neutral-300">
      남은 시간 <strong className="font-semibold text-white">{minutes}:{seconds}</strong>
    </div>
  );
}
