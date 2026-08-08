"use client";

import type { JSX } from "react";

import { useSeatSnapshot } from "@/hooks/use-seat-snapshot";
import type { Seat as SeatType } from "@/types";
import { Toast } from "@/components/toast/Toast";

import { HoldTimer } from "./HoldTimer";
import { SeatMap } from "./SeatMap";

interface SeatMapContainerProps {
  sessionId: string;
  seats: readonly SeatType[];
}

export function SeatMapContainer({
  sessionId,
  seats,
}: SeatMapContainerProps): JSX.Element {
  useSeatSnapshot(sessionId);

  return (
    <>
      <SeatMap seats={seats} sessionId={sessionId} />
      <HoldTimer />
      <Toast />
    </>
  );
}
