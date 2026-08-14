"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
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
        /*
         * 기본 rootNode는 emblaRef가 걸린 -z-10 배경 div다. 공연명 링크와
         * 미리보기 버튼은 그 div의 형제 서브트리라, 기본값이면 링크 위에
         * 마우스를 올려도 mouseenter가 캐러셀 루트에 닿지 않는다. 히어로
         * <section>으로 올려야 아래 주석과 ADR-006이 약속한 "클릭 직전에
         * 대상이 바뀌지 않는다"가 실제로 성립한다.
         */
        rootNode: (emblaRoot) => emblaRoot.closest("section"),
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

  /*
   * 플러그인은 슬라이드가 2장 이상일 때만 초기화된다 — init()이
   * `scrollSnapList().length <= 1`에서 내부 delay 배열을 채우기 전에 조기
   * 반환한다. 그 상태에서 play()를 부르면 setTimer()가 delay[...]를 읽어
   * TypeError를 던지고, useEffect 안이라 랜딩 전체가 error boundary로 떨어진다.
   * 마운트 가드(hasSlides)는 length > 0이므로 재생 가드는 따로 둔다.
   */
  const canAutoplay = slides.length > 1;

  useEffect(() => {
    // 플러그인 배열을 조건부로 만들면 reInit이 필요하고 인덱스가 리셋된다.
    // 항상 붙여 두고 재생/정지만 제어한다.
    const autoplay = emblaApi?.plugins()?.autoplay;
    if (!autoplay) return;

    // stop()은 초기화되지 않은 플러그인에서도 안전하다(autoplayActive 가드).
    if (reducedMotion || !canAutoplay) autoplay.stop();
    else autoplay.play();
  }, [emblaApi, reducedMotion, canAutoplay]);

  useEffect(() => {
    if (!emblaApi || !reducedMotion) return;

    /*
     * stopOnMouseEnter + stopOnInteraction:false 조합은 mouseleave 핸들러를
     * 등록하는데, 그 핸들러는 reduced-motion을 모른 채 무조건 재생을 재개한다.
     * 위 효과는 [emblaApi, reducedMotion]에만 의존하므로 다시 돌지 않아,
     * 한 번 호버했다 벗어나면 정지가 영구히 풀린다. 재개를 되받아 막는다.
     *
     * 플러그인 옵션을 reduced-motion에 따라 바꾸는 대신 이 방식을 쓰는 이유는,
     * 옵션 변경이 reInit을 부르고 그때 인덱스가 리셋되기 때문이다.
     */
    const autoplay = emblaApi.plugins()?.autoplay;
    if (!autoplay) return;

    const stopAgain = () => autoplay.stop();

    emblaApi.on("autoplay:play", stopAgain);

    return () => {
      emblaApi.off("autoplay:play", stopAgain);
    };
  }, [emblaApi, reducedMotion]);

  const hasSlides = slides.length > 0;
  /*
   * reInit으로 슬라이드 수가 줄어드는 순간 selectedIndex가 범위를 넘을 수 있다.
   * hasSlides 가드 안에서만 쓰므로 slides[0]은 항상 존재한다.
   */
  const currentSlide = slides[selectedIndex] ?? slides[0];

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
          /*
           * 배경이 5초마다 바뀌는데 무슨 공연인지 알 방법이 미리보기 버튼의
           * alt뿐이었다. CTA 아래에 두는 이유는 헤드라인이 주인공이어야 하고
           * (UX_PRINCIPLES), 아래 미리보기 줄과 같은 대상을 가리켜 근접성이
           * 대응 관계를 설명해 주기 때문이다.
           *
           * aria-live를 붙이지 않는다. 5초마다 낭독되면 다른 콘텐츠를 덮는
           * 소음이 된다. 공연 5개 전체의 접근 경로는 미리보기 버튼의 alt가,
           * 상세 경로는 아래 카드 밴드가 이미 제공한다 — 알고 뺀 것이다.
           *
           * 전환에 페이드를 넣지 않는다. 캐러셀 예외가 허용하는 모션은 배경
           * 이미지의 가로 슬라이드뿐이다 (UI_GUIDE).
           */
          <p className="text-body-md text-mute">
            지금 보이는 공연{" "}
            {/*
             * pill CTA가 아니라 밑줄 텍스트다. 히어로 CTA는 2개까지이고,
             * 형태가 다르면 그 계산에 들어가지 않는다. autoplay가
             * stopOnMouseEnter라 마우스를 올리는 순간 롤링이 멈추므로
             * 클릭 직전에 대상이 바뀌지 않는다. 키보드 포커스는 멈추지
             * 않는다 — stopOnFocusIn은 기본 true지만 슬라이드 내부
             * 포커스(slideFocusStart)에만 반응하고, 슬라이드는 aria-hidden
             * 배경뿐이며 이 링크는 캐러셀 바깥이라 발화하지 않는다.
             * 5초 안에 Tab→Enter가 겹칠 확률이 낮아 감수한다 (ADR-006).
             */}
            <Link
              className="text-on-dark underline decoration-hairline-on-dark underline-offset-4 transition-colors duration-150 hover:decoration-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              href={`/shows/${currentSlide.id}`}
            >
              {currentSlide.title}
            </Link>
          </p>
        ) : null}

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
                 * 걸리지 않는다.
                 *
                 * 배경과 같은 원본을 쓰지만 다운로드는 공유되지 않는다. sizes가
                 * 다르면 브라우저가 다른 폭을 골라 캐시 키가 갈린다. 슬라이드당
                 * 별도 요청이 붙는 비용을 알고 감수하는 것이다 — 48px 썸네일이라
                 * 전송량 자체는 작다.
                 *
                 * 다만 srcset 후보가 48·96으로 좁혀지지는 않는다. next/image는
                 * sizes에 vw가 없으면 deviceSizes로 필터링하지 않고 allSizes
                 * (16~3840) 16개를 전부 후보로 낸다. 실제 전송은 브라우저가
                 * 48×DPR에 맞춰 고르므로 여전히 작고, 늘어나는 건 HTML 크기다.
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
