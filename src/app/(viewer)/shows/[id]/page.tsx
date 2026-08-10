import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Band } from "@/components/ui/Band";
import { buttonClassName } from "@/components/ui/Button";
import { cardClassName } from "@/components/ui/Card";
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
    <main>
      <Band fill tone="light" width="tool">
        <div className="space-y-3xl">
          <header className="space-y-lg">
            <h1 className="text-display-sm">{show.title}</h1>
            {/* plain text + whitespace-pre-wrap. 마크다운·HTML 렌더 금지 (저장형 XSS) */}
            <p className="max-w-3xl whitespace-pre-wrap text-body-sm text-body-aa">
              {show.description}
            </p>
          </header>

          <section aria-labelledby="sessions-heading" className="space-y-lg">
            <div className="space-y-xs">
              <h2 className="text-display-xs" id="sessions-heading">
                회차 선택
              </h2>
              <p className="text-body-sm text-body-aa">
                관람할 회차를 선택해 좌석을 확인하세요.
              </p>
            </div>

            <ul className="space-y-lg">
              {sessions.map((session) => (
                <li key={session.id}>
                  <Link
                    className={cardClassName({
                      interactive: true,
                      className:
                        "flex flex-wrap items-center justify-between gap-lg",
                    })}
                    href={`/sessions/${session.id}/seats`}
                  >
                    <time
                      className="text-body-sm text-ink"
                      dateTime={session.startsAt}
                    >
                      {formatSessionTime(session.startsAt)}
                    </time>
                    <span
                      className={buttonClassName({
                        variant: "primary",
                        size: "sm",
                      })}
                    >
                      좌석 선택
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Band>
    </main>
  );
}
