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
    /*
     * 실제 off는 핸들러를 떼어 낸다. 무동작 스텁으로 두면 구독 해제 후에도
     * listeners에 남아, 정리를 빠뜨린 구현이 테스트를 통과해 버린다.
     */
    off: vi.fn((event: string, handler: () => void) => {
      if (listeners.get(event) === handler) listeners.delete(event);
      return emblaApi;
    }),
  };

  return { autoplay, emblaApi, listeners, selectedScrollSnap };
});

/** 목킹된 플러그인에 넘어간 Autoplay 옵션. 기본값 의존을 테스트로 고정한다. */
const autoplayOptions = vi.hoisted(
  () => ({ current: undefined }) as { current?: Record<string, unknown> },
);

vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), emblaApi],
}));

vi.mock("embla-carousel-autoplay", () => ({
  default: (options: Record<string, unknown>) => {
    autoplayOptions.current = options;
    return { name: "autoplay" };
  },
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
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("names the show behind the current slide and links to it", () => {
    renderHero();

    expect(
      screen.getByRole("link", { name: "여름밤 시티 팝 콘서트" }),
    ).toHaveAttribute("href", "/shows/show-01");
  });

  it("moves the name and its link along with the background", () => {
    renderHero();

    selectedScrollSnap.mockReturnValue(2);
    act(() => {
      listeners.get("select")?.();
    });

    expect(
      screen.getByRole("link", { name: "서울 심포니 마스터피스" }),
    ).toHaveAttribute("href", "/shows/show-03");
    expect(
      screen.queryByRole("link", { name: "여름밤 시티 팝 콘서트" }),
    ).not.toBeInTheDocument();
  });

  it("does not announce the rotating name through a live region", () => {
    // 5초마다 낭독되면 스크린리더 사용자에게는 다른 콘텐츠를 덮는 소음이 된다.
    // 5개 공연 전체에 대한 접근 경로는 미리보기 버튼의 alt와 아래 카드 밴드가
    // 이미 제공한다 — 빼먹은 게 아니라 알고 뺀 것이므로 이 테스트가 지킨다.
    renderHero();

    const link = screen.getByRole("link", { name: "여름밤 시티 팝 콘서트" });

    expect(link.closest("[aria-live]")).toBeNull();
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

  it("never calls play() with a single slide", () => {
    /*
     * 플러그인의 init()은 scrollSnapList().length <= 1이면 내부 delay 배열을
     * 할당하기 전에 조기 반환한다. 그 상태에서 play()를 부르면 setTimer()가
     * delay[...]를 읽어 TypeError로 랜딩 전체가 죽는다. 마운트 가드는
     * length > 0인데 플러그인의 전제는 length > 1이라 생긴 간극이다.
     */
    renderHero([SLIDES[0]]);

    expect(autoplay.play).not.toHaveBeenCalled();
  });

  it("keeps a single slide visible even though autoplay stays off", () => {
    // 재생만 막는 것이지 슬라이드를 감추는 게 아니다.
    renderHero([SLIDES[0]]);

    expect(
      screen.getByRole("link", { name: "여름밤 시티 팝 콘서트" }),
    ).toHaveAttribute("href", "/shows/show-01");
  });

  it("re-stops autoplay if the plugin resumes it under reduced motion", () => {
    /*
     * stopOnMouseEnter + stopOnInteraction:false 조합은 mouseleave 핸들러를
     * 등록하는데, 그 핸들러는 reduced-motion을 모른 채 무조건 재생을 재개한다.
     * 한 번 호버했다 벗어나면 정지가 영구히 풀리므로 재개를 되받아 막아야 한다.
     */
    stubReducedMotion(true);
    renderHero();

    act(() => {
      listeners.get("autoplay:play")?.();
    });

    expect(autoplay.stop.mock.calls.length).toBeGreaterThan(1);
  });

  it("does not fight the plugin when motion is allowed", () => {
    // 같은 구독이 정상 사용자의 재생까지 되돌리면 캐러셀이 통째로 멈춘다.
    renderHero();
    autoplay.stop.mockClear();

    act(() => {
      listeners.get("autoplay:play")?.();
    });

    expect(autoplay.stop).not.toHaveBeenCalled();
  });

  it("anchors mouse-enter detection to the whole hero, not the background", () => {
    /*
     * autoplay의 rootNode 기본값은 emblaRef가 걸린 -z-10 배경 div다. 공연명
     * 링크와 미리보기 버튼은 그 div의 형제라 마우스를 올려도 mouseenter가
     * 도달하지 않는다. rootNode로 히어로 <section>을 지정해야 주석과 ADR-006이
     * 약속한 "클릭 직전에 대상이 바뀌지 않는다"가 실제로 성립한다.
     */
    renderHero();

    const resolveRoot = autoplayOptions.current?.rootNode as
      | ((root: HTMLElement) => HTMLElement | null)
      | undefined;

    expect(resolveRoot).toBeTypeOf("function");

    const section = document.createElement("section");
    const background = document.createElement("div");
    section.append(background);

    expect(resolveRoot?.(background)).toBe(section);
  });
});
