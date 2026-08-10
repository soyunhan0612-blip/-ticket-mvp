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
    <div className="rounded-card border border-hairline-on-dark bg-ink px-lg py-md text-body-sm text-on-dark">
      {/* 어두운 밴드에서 primary red는 대비가 3.08:1이라 본문에 쓰지 않는다 (UI_GUIDE 토큰 편차) */}
      남은 시간{" "}
      <strong className="font-bold">
        {minutes}:{seconds}
      </strong>
    </div>
  );
}
