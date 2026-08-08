"use client";

import Link from "next/link";
import type { JSX } from "react";

import type { Reservation } from "@/types";

import { ReservationCard } from "./ReservationCard";

type ReservationWithoutUserId = Omit<Reservation, "userId">;

interface ReservationListProps {
  reservations: ReservationWithoutUserId[];
}

export function ReservationList({ reservations }: ReservationListProps): JSX.Element {
  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm leading-6 text-neutral-400">
          예매 내역이 없습니다.
        </p>
        <Link
          className="mt-4 text-sm font-medium text-white hover:text-neutral-200"
          href="/shows"
        >
          공연 둘러보기
        </Link>
      </div>
    );
  }

  const confirmed = reservations.filter((r) => r.status === "confirmed");
  const cancelled = reservations.filter((r) => r.status === "cancelled");
  const sorted = [...confirmed, ...cancelled];

  return (
    <ul className="space-y-4">
      {sorted.map((reservation) => (
        <li key={reservation.id}>
          <ReservationCard {...reservation} />
        </li>
      ))}
    </ul>
  );
}
