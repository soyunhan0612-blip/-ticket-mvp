import Image from "next/image";
import Link from "next/link";

import { cardClassName } from "@/components/ui/Card";
import type { Show } from "@/types";

/*
 * `/`와 `/shows`가 공유하는 공연 카드. 두 화면이 같은 마크업을 각자 들고 있어
 * 한쪽만 고치면 카드가 화면마다 달라졌다.
 *
 * 제목은 포스터 하단 띠 위에 올린다. 포스터가 카드에서 가장 큰 요소인데 제목이
 * 그 아래 놓이면 "카드 안 계층은 제목 > 포스터"(UX_PRINCIPLES)가 화면에서
 * 뒤집힌다. 띠 규격과 근거는 docs/UI_GUIDE.md "카드 하단 띠" 참조.
 */
interface ShowCardProps {
  show: Show;
  /**
   * 그리드 열 수가 화면마다 달라 이미지 요청 폭도 달라진다. 하드코딩하면
   * 한쪽이 필요보다 큰 이미지를 받는다.
   */
  sizes: string;
  /**
   * 랜딩은 h2("공연 목록") 아래라 h3, `/shows`는 h1 아래라 h2다.
   * 하나로 고정하면 한쪽에서 헤딩 레벨이 건너뛴다.
   */
  headingLevel: 2 | 3;
  /**
   * 설명을 몇 줄까지 보여줄지. 기본 3줄이고, 공연을 고르는 것이 유일한 목적인
   * `/shows`만 4줄로 넓힌다 — 랜딩은 카드가 헤드라인의 보조라 더 짧아야 한다.
   */
  descriptionLines?: 3 | 4;
}

/*
 * Tailwind는 클래스 이름을 정적으로 스캔하므로 `line-clamp-${n}`으로 조립하면
 * 빌드에서 누락된다. 허용값을 리터럴로 적어 둔다.
 */
const DESCRIPTION_CLAMP = {
  3: "line-clamp-3",
  4: "line-clamp-4",
} as const;

export function ShowCard({
  show,
  sizes,
  headingLevel,
  descriptionLines = 3,
}: ShowCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <Link
      className={cardClassName({
        interactive: true,
        className: "block h-full space-y-md",
      })}
      href={`/shows/${show.id}`}
    >
      {show.posterUrl ? (
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card bg-canvas-soft">
          {/*
           * alt는 비워 둔다. 제목이 형제 텍스트로 바로 아래 있으므로 alt에도
           * 넣으면 링크의 접근 가능한 이름에서 제목이 두 번 읽힌다.
           * 셀러 프리셋 SVG도 3:4라 같은 틀에 들어간다. object-contain을 쓰는
           * PosterPresetSelector와 달리 여기는 사진이므로 cover로 채운다.
           */}
          <Image
            alt=""
            className="object-cover"
            fill
            sizes={sizes}
            src={show.posterUrl}
          />
          {/*
           * 높이를 지정하지 않는다 — 안쪽 제목과 패딩이 띠 높이를 정하므로
           * 제목이 두 줄이 되면 띠도 함께 두꺼워진다. 고정 px나 비율로 잡으면
           * 카드 폭이 1/2/3열로 바뀔 때 넘치거나 과해진다.
           */}
          <div className="absolute inset-x-0 bottom-0">
            {/*
             * ink 72%를 하단 띠에만 건다. 포스터 전체를 덮으면 카드가 dark
             * 표면이 되어 "dark 히어로 → light 카드" 극성 반전이 카드 안에서
             * 다시 뒤집힌다 — 이 DS가 깊이를 만드는 유일한 장치다.
             * bg-ink/72 같은 슬래시 문법은 CSS 변수가 hex라 동작하지 않는다.
             */}
            <div className="absolute inset-0 bg-ink opacity-[0.72]" />
            <Heading className="relative line-clamp-2 px-lg py-md text-display-xs text-on-dark">
              {show.title}
            </Heading>
          </div>
        </div>
      ) : (
        // 포스터가 없으면 띠를 걸 자리도 없다. 제목까지 사라지면 카드가 설명만
        // 남은 익명 블록이 되므로 텍스트로 렌더한다.
        <Heading className="text-display-xs text-ink">{show.title}</Heading>
      )}

      <p
        className={`${DESCRIPTION_CLAMP[descriptionLines]} text-body-sm text-body-aa`}
      >
        {show.description}
      </p>
    </Link>
  );
}
