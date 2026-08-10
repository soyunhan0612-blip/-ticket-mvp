import type { Metadata } from "next";

import { ShowCard } from "@/components/show/ShowCard";
import { Band } from "@/components/ui/Band";
import { getShowStore } from "@/services";

export const metadata: Metadata = {
  title: "공연 목록 · 티켓 MVP",
  description: "예매할 공연을 둘러보고 상세 정보와 회차를 확인하세요.",
};

export default async function ShowsPage() {
  const shows = await getShowStore().list();

  return (
    <main className="flex flex-1 flex-col">
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
                  {/* 그리드가 1/2/3열로 바뀌므로 sizes도 그에 맞춘다. */}
                  <ShowCard
                    // 목록은 공연을 고르는 화면이라 랜딩보다 설명을 한 줄 더 준다.
                    descriptionLines={4}
                    headingLevel={2}
                    show={show}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Band>
    </main>
  );
}
