import Image from "next/image";
import Link from "next/link";

import { ShowcaseHero } from "@/components/home/ShowcaseHero";
import { Band } from "@/components/ui/Band";
import { buttonClassName } from "@/components/ui/Button";
import { cardClassName } from "@/components/ui/Card";
import { toHeroSlides } from "@/lib/poster-image";
import { getShowStore } from "@/services";

/*
 * 유일한 마케팅 표면. DS HeroBandDark → ContentBandLight 리듬을 그대로 쓴다.
 * 예매 도구 화면(좌석맵·예매내역·Admin)에는 이 톤을 쓰지 않는다 —
 * docs/UX_PRINCIPLES.md 원칙 1의 적용 범위 참조.
 */
export default async function Home() {
  const shows = await getShowStore().list();
  const featured = shows.slice(0, 3);
  const heroSlides = toHeroSlides(shows);

  return (
    <main>
      {/* 카피는 서버에서 조립해 넘긴다 — 클라이언트 번들에 들어가지 않는다. */}
      <ShowcaseHero slides={heroSlides}>
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
      </ShowcaseHero>

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
                    {/*
                     * 셀러 프리셋(SVG)도 3:4라 같은 틀에 들어간다. 옛 Redis 데이터처럼
                     * posterUrl이 없으면 이미지를 생략하고 텍스트만 남긴다.
                     * PosterPresetSelector가 object-contain을 쓰는 것과 달리 여기는
                     * 사진이므로 object-cover다 — 레터박스 없이 카드를 채운다.
                     */}
                    {show.posterUrl ? (
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card bg-canvas-soft">
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          sizes="(min-width: 768px) 33vw, 100vw"
                          src={show.posterUrl}
                        />
                      </div>
                    ) : null}
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
