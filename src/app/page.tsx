import Link from "next/link";

import { Band } from "@/components/ui/Band";
import { buttonClassName } from "@/components/ui/Button";
import { cardClassName } from "@/components/ui/Card";
import { getShowStore } from "@/services";

/*
 * 유일한 마케팅 표면. DS HeroBandDark → ContentBandLight 리듬을 그대로 쓴다.
 * 예매 도구 화면(좌석맵·예매내역·Admin)에는 이 톤을 쓰지 않는다 —
 * docs/UX_PRINCIPLES.md 원칙 1의 적용 범위 참조.
 */
export default async function Home() {
  const shows = await getShowStore().list();
  const featured = shows.slice(0, 3);

  return (
    <main>
      <Band tone="dark" width="wide">
        <div className="flex min-h-[420px] flex-col justify-end gap-2xl py-3xl">
          <p className="text-eyebrow tracking-wide">공연 예매</p>
          <h1 className="max-w-4xl text-display-xl">
            보고 싶은 자리,
            <br />
            지금 고르세요.
          </h1>
          <p className="max-w-2xl text-display-lg text-mute">
            2,000석을 한 화면에서. 남이 잡은 좌석은 3초마다 그대로 반영됩니다.
          </p>
          <div className="flex flex-wrap gap-lg">
            <Link className={buttonClassName({ variant: "primary" })} href="/shows">
              공연 둘러보기
            </Link>
            <Link
              className={buttonClassName({ variant: "outline-on-dark" })}
              href="/seller/new"
            >
              공연 등록하기
            </Link>
          </div>
        </div>
      </Band>

      <Band tone="light" width="wide">
        <div className="space-y-2xl">
          <div className="space-y-sm">
            <p className="text-caption-upper uppercase text-primary">지금 예매</p>
            <h2 className="text-display-sm">공연 목록</h2>
          </div>

          {featured.length === 0 ? (
            <p className="text-body-sm text-body-aa">
              아직 등록된 공연이 없습니다.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-lg md:grid-cols-3">
              {featured.map((show) => (
                <li key={show.id}>
                  <Link
                    className={cardClassName({
                      interactive: true,
                      className: "block h-full space-y-md",
                    })}
                    href={`/shows/${show.id}`}
                  >
                    <h3 className="text-display-xs">{show.title}</h3>
                    <p className="line-clamp-3 text-body-sm text-body-aa">
                      {show.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            className={buttonClassName({ variant: "outline-dark" })}
            href="/shows"
          >
            전체 공연 보기
          </Link>
        </div>
      </Band>
    </main>
  );
}
