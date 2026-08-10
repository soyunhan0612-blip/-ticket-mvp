import type { Metadata } from "next";
import Link from "next/link";

import { Band } from "@/components/ui/Band";
import { cardClassName } from "@/components/ui/Card";
import { getShowStore } from "@/services";

export const metadata: Metadata = {
  title: "공연 목록 · 티켓 MVP",
  description: "예매할 공연을 둘러보고 상세 정보와 회차를 확인하세요.",
};

export default async function ShowsPage() {
  const shows = await getShowStore().list();

  return (
    <main>
      <Band fill tone="light" width="wide">
        <div className="space-y-2xl">
          <header className="space-y-sm">
            <p className="text-caption-upper uppercase text-primary">공연 예매</p>
            <h1 className="text-display-sm">공연 목록</h1>
            <p className="text-body-sm text-body-aa">
              관람할 공연을 선택해 상세 정보와 회차를 확인하세요.
            </p>
          </header>

          {shows.length === 0 ? (
            <p className="py-24 text-center text-body-sm text-body-aa">
              아직 등록된 공연이 없습니다.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {shows.map((show) => (
                <li key={show.id}>
                  <Link
                    className={cardClassName({
                      interactive: true,
                      className: "block h-full space-y-md",
                    })}
                    href={`/shows/${show.id}`}
                  >
                    <h2 className="text-display-xs">{show.title}</h2>
                    <p className="line-clamp-4 text-body-sm text-body-aa">
                      {show.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Band>
    </main>
  );
}
