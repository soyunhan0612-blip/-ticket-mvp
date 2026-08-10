import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShowcaseHero } from "./ShowcaseHero";
import type { HeroSlide } from "@/lib/poster-image";

/*
 * Embla는 초기화할 때 ResizeObserver를 쓰고 getBoundingClientRect로 슬라이드 폭을
 * 잰다. jsdom에는 ResizeObserver가 없고 rect는 전부 0이라 실제로 구동하면
 * scrollSnapList가 비어 scrollTo가 무동작한다. 폴리필을 채워 넣는 대신 모듈째
 * 목킹한다 — 검증 대상은 우리 연동 로직이지 라이브러리의 스크롤 계산이 아니다.
 */
const { autoplay, emblaApi, listeners, selectedScrollSnap } = vi.hoisted(() => {
  const listeners = new Map<string, () => void>();
  const autoplay = { play: vi.fn(), stop: vi.fn() };
  const selectedScrollSnap = vi.fn(() => 0);
  const emblaApi = {
    scrollTo: vi.fn(),
    selectedScrollSnap,
    plugins: () => ({ autoplay }),
    // 구현이 .on(a).on(b) 체이닝을 쓰므로 자기 자신을 돌려줘야 한다.
    on: vi.fn((event: string, handler: () => void) => {
      listeners.set(event, handler);
      return emblaApi;
    }),
    off: vi.fn(() => emblaApi),
  };

  return { autoplay, emblaApi, listeners, selectedScrollSnap };
});

vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), emblaApi],
}));

vi.mock("embla-carousel-autoplay", () => ({
  default: () => ({ name: "autoplay" }),
}));

const SLIDES: HeroSlide[] = [
  { id: "show-01", title: "여름밤 시티 팝 콘서트", heroImageUrl: "/posters/hero/city-pop.jpg" },
  { id: "show-02", title: "뮤지컬 별을 걷는 사람들", heroImageUrl: "/posters/hero/musical-stars.jpg" },
  { id: "show-03", title: "서울 심포니 마스터피스", heroImageUrl: "/posters/hero/symphony.jpg" },
];

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

function renderHero(slides: HeroSlide[] = SLIDES) {
  return render(
    <ShowcaseHero slides={slides}>
      <h1>보고 싶은 자리, 지금 고르세요.</h1>
    </ShowcaseHero>,
  );
}

beforeEach(() => {
  stubReducedMotion(false);
  selectedScrollSnap.mockReturnValue(0);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  listeners.clear();
});

describe("ShowcaseHero", () => {
  it("renders the hero copy passed as children", () => {
    renderHero();

    expect(
      screen.getByRole("heading", { name: "보고 싶은 자리, 지금 고르세요." }),
    ).toBeInTheDocument();
  });

  it("renders one preview button per slide", () => {
    renderHero();

    expect(screen.getAllByRole("button")).toHaveLength(SLIDES.length);
  });

  it("names each preview button after its show", () => {
    renderHero();

    // 텍스트 없는 버튼이지만 이미지 alt가 접근 가능한 이름을 준다.
    expect(
      screen.getByRole("button", { name: "뮤지컬 별을 걷는 사람들" }),
    ).toBeInTheDocument();
  });

  it("scrolls to the matching slide when a preview is clicked", () => {
    renderHero();

    screen.getByRole("button", { name: "서울 심포니 마스터피스" }).click();

    expect(emblaApi.scrollTo).toHaveBeenCalledWith(2);
  });

  it("marks the current slide with aria-current", () => {
    renderHero();

    const buttons = screen.getAllByRole("button");

    expect(buttons[0]).toHaveAttribute("aria-current", "true");
    expect(buttons[1]).toHaveAttribute("aria-current", "false");
  });

  it("follows Embla's select event when autoplay advances", () => {
    renderHero();

    selectedScrollSnap.mockReturnValue(2);
    act(() => {
      listeners.get("select")?.();
    });

    const buttons = screen.getAllByRole("button");

    expect(buttons[2]).toHaveAttribute("aria-current", "true");
    expect(buttons[0]).toHaveAttribute("aria-current", "false");
  });

  it("re-syncs on reInit so a resize cannot desync the strip", () => {
    renderHero();

    expect(listeners.has("reInit")).toBe(true);
  });

  it("hides the background carousel from assistive technology", () => {
    const { container } = renderHero();

    // 배경은 장식이다. 슬라이드가 읽히면 히어로 카피 앞에 의미 없는 이미지가 낭독된다.
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("renders copy without a background when no slide has a poster", () => {
    // Redis가 옛 시드 데이터를 들고 있으면 실제로 이 경로를 탄다.
    renderHero([]);

    expect(
      screen.getByRole("heading", { name: "보고 싶은 자리, 지금 고르세요." }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("starts autoplay when the visitor has no motion preference", () => {
    renderHero();

    // 훅이 SSR 안전값(정지)으로 시작해 matchMedia 확인 후 재생으로 넘어가므로
    // 호출 횟수가 아니라 마지막 결정이 재생인지를 본다.
    expect(autoplay.play).toHaveBeenCalled();
    expect(autoplay.play.mock.invocationCallOrder.at(-1)).toBeGreaterThan(
      autoplay.stop.mock.invocationCallOrder.at(-1) ?? 0,
    );
  });

  it("stops autoplay when the visitor prefers reduced motion", () => {
    stubReducedMotion(true);

    renderHero();

    expect(autoplay.stop).toHaveBeenCalled();
    expect(autoplay.play).not.toHaveBeenCalled();
  });

  it("still lets a reduced-motion visitor change slides by hand", () => {
    // 규칙은 "모션 금지"가 아니라 "예고 없는 자동 모션 금지"다.
    stubReducedMotion(true);
    renderHero();

    screen.getByRole("button", { name: "서울 심포니 마스터피스" }).click();

    expect(emblaApi.scrollTo).toHaveBeenCalledWith(2);
  });
});
