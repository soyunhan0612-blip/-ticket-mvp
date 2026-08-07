import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getShowStore } from "@/services";

interface ShowDetailPageProps {
  params: Promise<{ id: string }>;
}

const sessionTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatSessionTime(startsAt: string): string {
  const parts = sessionTimeFormatter.formatToParts(new Date(startsAt));
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const period = valueOf("dayPeriod");
  const localizedPeriod =
    period === "AM" ? "오전" : period === "PM" ? "오후" : period;

  return `${valueOf("year")}년 ${valueOf("month")} ${valueOf("day")}일 (${valueOf("weekday")}) ${localizedPeriod} ${valueOf("hour")}:${valueOf("minute")}`;
}

export async function generateMetadata({
  params,
}: ShowDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getShowStore().get(id);

  if (!result) {
    return { title: "공연을 찾을 수 없습니다" };
  }

  return {
    title: `${result.show.title} · 티켓 MVP`,
    description: result.show.description,
  };
}

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  const { id } = await params;
  const result = await getShowStore().get(id);

  if (!result) notFound();

  const { show, sessions } = result;

  return (
    <main className="min-h-screen bg-neutral-950 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {show.title}
          </h1>
          <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-neutral-300">
            {show.description}
          </p>
        </header>

        <section aria-labelledby="sessions-heading">
          <h2
            className="text-lg font-semibold text-white"
            id="sessions-heading"
          >
            회차 선택
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            관람할 회차를 선택해 좌석을 확인하세요.
          </p>

          <ul className="mt-4 space-y-4">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6 transition-colors duration-150 hover:border-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                  href={`/sessions/${session.id}/seats`}
                >
                  <time
                    className="text-sm leading-6 text-neutral-300"
                    dateTime={session.startsAt}
                  >
                    {formatSessionTime(session.startsAt)}
                  </time>
                  <span className="shrink-0 text-sm font-medium text-white">
                    좌석 선택
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
