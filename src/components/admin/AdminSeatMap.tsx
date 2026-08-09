"use client";

import { useSetAtom } from "jotai";
import { type JSX, useEffect, useMemo } from "react";

import { seatMapReadOnlyAtom } from "@/atoms/seat";
import { SeatMap } from "@/components/seat/SeatMap";
import { useSeatSnapshot } from "@/hooks/use-seat-snapshot";
import {
  generateSeatsForPreset,
  getPreset,
  type SeatPresetId,
} from "@/lib/seat-preset";

interface AdminSeatMapProps {
  sessionId: string;
  presetId: SeatPresetId;
}

export function AdminSeatMap({
  sessionId,
  presetId,
}: AdminSeatMapProps): JSX.Element {
  const setReadOnly = useSetAtom(seatMapReadOnlyAtom);
  const preset = getPreset(presetId);
  const seats = useMemo(() => generateSeatsForPreset(presetId), [presetId]);

  useSeatSnapshot(sessionId);

  useEffect(() => {
    setReadOnly(true);
    return () => setReadOnly(false);
  }, [setReadOnly]);

  return (
    <SeatMap
      readOnly
      seats={seats}
      sections={preset.sections}
      sessionId={sessionId}
    />
  );
}
