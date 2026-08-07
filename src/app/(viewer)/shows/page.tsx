import type { Metadata } from "next";
import Link from "next/link";

import { getShowStore } from "@/services";

export const metadata: Metadata = {
  title: "공연 목록 · 티켓 MVP",
  description: "예매할 공연을 둘러보고 상세 정보와 회차를 확인하세요.",
};

export default async function ShowsPage() {
  const shows = await getShowStore().list();

  return (
    <main className="min-h-screen bg-neutral-950 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            공연 목록
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            관람할 공연을 선택해 상세 정보와 회차를 확인하세요.
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show) => (
            <li key={show.id}>
              <Link
                className="block h-full rounded-lg border border-neutral-800 bg-neutral-900 p-6 transition-colors duration-150 hover:border-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                href={`/shows/${show.id}`}
              >
                <h2 className="text-lg font-semibold text-white">{show.title}</h2>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  {show.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
