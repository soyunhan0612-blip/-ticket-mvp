"use client";

import type { JSX } from "react";

import { ReservationList } from "@/components/reservation/ReservationList";
import { useMyReservations } from "@/hooks/use-my-reservations";

export default function ReservationsPage(): JSX.Element {
  const { data, isLoading, isError, error } = useMyReservations();

  return (
    <main className="min-h-screen bg-neutral-950 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            내 예매
          </h1>
        </header>

        {isLoading && (
          <p className="text-sm leading-6 text-neutral-400">불러오는 중...</p>
        )}

        {isError && (
          <p className="text-sm leading-6 text-red-500">
            {error?.message ?? "예매 목록을 불러오지 못했습니다."}
          </p>
        )}

        {data && <ReservationList reservations={data} />}
      </div>
    </main>
  );
}
