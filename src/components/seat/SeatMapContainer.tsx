"use client";

import type { JSX } from "react";

import { useSeatSnapshot } from "@/hooks/use-seat-snapshot";
import type { Section } from "@/lib/seat-map";
import type { Seat as SeatType } from "@/types";
import { Toast } from "@/components/toast/Toast";

import { ConfirmBar } from "./ConfirmBar";
import { HoldTimer } from "./HoldTimer";
import { SeatMap } from "./SeatMap";

interface SeatMapContainerProps {
  sessionId: string;
  seats: readonly SeatType[];
  sections: readonly Section[];
}

export function SeatMapContainer({
  sessionId,
  seats,
  sections,
}: SeatMapContainerProps): JSX.Element {
  useSeatSnapshot(sessionId);

  return (
    <>
      <SeatMap seats={seats} sessionId={sessionId} sections={sections} />
      <HoldTimer />
      <ConfirmBar sessionId={sessionId} />
      <Toast />
    </>
  );
}
