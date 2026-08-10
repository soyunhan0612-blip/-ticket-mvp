"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

import { Band } from "@/components/ui/Band";
import type { HeroSlide } from "@/lib/poster-image";

/*
 * 랜딩 전용 조합물이다. components/ui/는 프리미티브(카드·버튼·입력) + Band만
 * 유지하므로 여기에 두지 않는다 — docs/UI_GUIDE.md "컴포넌트" 참조.
 *
 * 자동 롤링은 애니메이션 정책의 유일한 예외다. 근거와 제약(reduced-motion 정지,
 * 호버 시 정지, 확산 금지)은 docs/UI_GUIDE.md "예외: 랜딩 히어로 배경 캐러셀"에 있다.
 */

/** 자동 전환 간격. 3초는 읽기 전에 넘어가고 8초는 정지처럼 보인다. */
const AUTOPLAY_DELAY_MS = 5000;

/** Embla 기본 25(약 400ms)는 배경 전환에 급하다. 45는 약 700ms. */
const SCROLL_DURATION = 45;

interface ShowcaseHeroProps {
  slides: readonly HeroSlide[];
  /**
   * 히어로 카피와 CTA. 서버에서 조립해 넘기면 그 부분은 RSC payload로 내려가
   * 클라이언트 번들에 들어가지 않는다.
   */
  children: ReactNode;
}

/**
 * `prefers-reduced-motion`을 구독한다.
 *
 * 초기값이 true인 이유: SSR에서는 matchMedia를 알 수 없다. false로 시작하면
 * hydration 직후 autoplay가 한 프레임 돌다 멈추는 깜빡임이 생긴다. true로
 * 시작하면 최악의 경우 "잠깐 정지 후 시작"이라 눈에 띄지 않는다.
 */
function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export function ShowcaseHero({ slides, children }: ShowcaseHeroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      duration: SCROLL_DURATION,
      /*
       * 배경 드래그를 허용하면 히어로 위 CTA 버튼의 클릭이 드래그로 오인된다.
       * 좌석맵에서 이미 겪은 문제다 (ZoomPanSvg.test.tsx의 포인터 캡처 회귀).
       * 조작은 아래 미리보기 버튼으로만 받는다.
       */
      watchDrag: false,
    },
    [
      Autoplay({
        delay: AUTOPLAY_DELAY_MS,
        // true면 미리보기를 한 번 누른 뒤 자동 재생이 영구 정지한다.
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
  );

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());

    onSelect();
    // reInit도 구독한다 — 리사이즈로 재초기화되면 인덱스가 어긋난다.
    emblaApi.on("select", onSelect).on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    // 플러그인 배열을 조건부로 만들면 reInit이 필요하고 인덱스가 리셋된다.
    // 항상 붙여 두고 재생/정지만 제어한다.
    const autoplay = emblaApi?.plugins()?.autoplay;
    if (!autoplay) return;

    if (reducedMotion) autoplay.stop();
    else autoplay.play();
  }, [emblaApi, reducedMotion]);

  const hasSlides = slides.length > 0;

  return (
    <Band
      className="relative isolate overflow-hidden"
      tone="dark"
      width="wide"
    >
      {hasSlides ? (
        /*
         * Band의 안쪽 컨테이너에는 position이 없으므로 absolute의 기준은
         * relative가 걸린 <section>이 된다. 그래서 children으로 넘겨도 배경이
         * full-bleed로 깔린다. Band에 relative가 추가되면 조용히 깨진다.
         */
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="h-full overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {slides.map((slide, index) => (
                <div
                  className="relative h-full min-w-0 flex-[0_0_100%]"
                  key={slide.id}
                >
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    // 첫 슬라이드만 preload한다. 여럿에 붙이면 경쟁해 LCP가 나빠진다.
                    priority={index === 0}
                    sizes="100vw"
                    src={slide.heroImageUrl}
                  />
                </div>
              ))}
            </div>
          </div>
          {/*
           * ink 단색 72%. 밴드의 원래 배경색과 같은 색이라 두 번째 색조를
           * 도입하지 않는다. 흰 텍스트는 ink 위에서 13.4:1이고 순백 사진이 28%
           * 비쳐도 약 4.9:1로 본문 AA를 넘는 계산값이다. 임의로 내리지 말 것.
           * bg-ink/72 같은 슬래시 문법은 CSS 변수가 hex라 동작하지 않는다.
           */}
          <div className="absolute inset-0 bg-ink opacity-[0.72]" />
        </div>
      ) : null}

      <div className="flex min-h-[420px] flex-col justify-end gap-2xl py-3xl">
        {children}

        {hasSlides ? (
          <div
            aria-label="공연 미리보기 선택"
            className="flex flex-wrap gap-md"
            role="group"
          >
            {slides.map((slide, index) => (
              <button
                aria-current={index === selectedIndex}
                className={`relative h-16 w-12 overflow-hidden rounded-card border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                  index === selectedIndex
                    ? "border-on-dark"
                    : "border-hairline-on-dark hover:border-on-dark"
                }`}
                key={slide.id}
                onClick={() => emblaApi?.scrollTo(index)}
                type="button"
              >
                {/*
                 * 텍스트 없는 버튼이지만 alt가 접근 가능한 이름을 준다 — 아이콘이
                 * 아니라 이름 있는 콘텐츠 이미지이므로 "아이콘만 있는 버튼 금지"에
                 * 걸리지 않는다. 16:9 원본을 48px에서 잘라 쓰므로 추가 다운로드가 없다.
                 */}
                <Image
                  alt={slide.title}
                  className="object-cover"
                  fill
                  sizes="48px"
                  src={slide.heroImageUrl}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Band>
  );
}
