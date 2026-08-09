"use client";

import type { JSX } from "react";

import { useSeatSnapshot } from "@/hooks/use-seat-snapshot";
import type { Seat as SeatType } from "@/types";
import { Toast } from "@/components/toast/Toast";

import { ConfirmBar } from "./ConfirmBar";
import { HoldTimer } from "./HoldTimer";
import { SeatMap } from "./SeatMap";

interface SeatMapContainerProps {
  sessionId: string;
  seats: readonly SeatType[];
  sections: readonly string[];
}

export function SeatMapContainer({
  sessionId,
  seats,
  sections,
}: SeatMapContainerProps): JSX.Element {
  useSeatSnapshot(sessionId);

  return (
    <>
      <SeatMap seats={seats} sections={sections} sessionId={sessionId} />
      <HoldTimer />
      <ConfirmBar sessionId={sessionId} />
      <Toast />
    </>
  );
}
