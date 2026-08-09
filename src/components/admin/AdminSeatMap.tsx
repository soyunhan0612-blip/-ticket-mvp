"use client";

import { useSetAtom } from "jotai";
import { type JSX, useEffect } from "react";

import { seatMapReadOnlyAtom } from "@/atoms/seat";
import { SeatMap } from "@/components/seat/SeatMap";
import { useSeatSnapshot } from "@/hooks/use-seat-snapshot";
import type { Seat } from "@/types";

interface AdminSeatMapProps {
  sessionId: string;
  seats: readonly Seat[];
  sections: readonly string[];
}

export function AdminSeatMap({
  sessionId,
  seats,
  sections,
}: AdminSeatMapProps): JSX.Element {
  const setReadOnly = useSetAtom(seatMapReadOnlyAtom);

  useSeatSnapshot(sessionId);

  useEffect(() => {
    setReadOnly(true);
    return () => setReadOnly(false);
  }, [setReadOnly]);

  return (
    <SeatMap
      readOnly
      seats={seats}
      sections={sections}
      sessionId={sessionId}
    />
  );
}
