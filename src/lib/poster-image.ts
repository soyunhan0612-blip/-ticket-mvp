import type { Show } from "@/types";

/*
 * 시드 공연은 썸네일(3:4)과 히어로 배경(16:9) 두 장을 갖는다. Show에 heroImageUrl
 * 필드를 더하지 않고 경로 규약으로 유도하는 이유는, 셀러가 등록한 공연에는 와이드
 * 대응본이 없어서 필드만 늘고 쓰이지 않기 때문이다.
 *
 * 자산 규격과 선정 기준은 docs/UI_GUIDE.md "포스터 이미지" 참조.
 */
const POSTER_DIR = "/posters/";
const HERO_DIR = "/posters/hero/";

/** 히어로 캐러셀에 올릴 최대 슬라이드 수. */
export const HERO_SLIDE_LIMIT = 5;

export interface HeroSlide {
  id: string;
  title: string;
  heroImageUrl: string;
}

/**
 * 썸네일 경로에서 대응하는 히어로 와이드 경로를 유도한다.
 *
 * 와이드 대응본이 없는 입력에는 null을 돌려준다 — 셀러 등록 프리셋(.svg),
 * 포스터가 없는 공연, 이미 히어로인 경로, 포스터 디렉터리 밖의 경로.
 * 셀러 등록물이 랜딩 최상단을 점유하지 않게 하는 게이트 역할도 겸한다.
 */
export function toHeroImageUrl(posterUrl: string | undefined): string | null {
  if (!posterUrl) return null;
  if (!posterUrl.startsWith(POSTER_DIR)) return null;
  if (posterUrl.startsWith(HERO_DIR)) return null;
  if (!posterUrl.endsWith(".jpg")) return null;

  return `${HERO_DIR}${posterUrl.slice(POSTER_DIR.length)}`;
}

/**
 * 히어로 캐러셀 슬라이드를 선별한다.
 *
 * HERO_SLIDE_LIMIT으로 자르는 이유: 8장을 모두 순환하면 한 바퀴가 40초를 넘어
 * 사용자가 순환 자체를 인지하지 못하고, 썸네일 줄도 모바일에서 넘친다.
 */
export function toHeroSlides(shows: readonly Show[]): HeroSlide[] {
  const slides: HeroSlide[] = [];

  for (const show of shows) {
    if (slides.length >= HERO_SLIDE_LIMIT) break;

    const heroImageUrl = toHeroImageUrl(show.posterUrl);
    if (heroImageUrl === null) continue;

    slides.push({ id: show.id, title: show.title, heroImageUrl });
  }

  return slides;
}
