import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MOCK_SHOWS } from "./mock-data";
import { HERO_SLIDE_LIMIT, toHeroImageUrl, toHeroSlides } from "./poster-image";
import type { Show } from "@/types";

describe("toHeroImageUrl", () => {
  it("derives the wide hero path from a seed poster path", () => {
    expect(toHeroImageUrl("/posters/city-pop.jpg")).toBe(
      "/posters/hero/city-pop.jpg",
    );
  });

  it("returns null for seller preset posters", () => {
    // 프리셋 SVG는 와이드 대응본이 없다. 셀러가 등록한 공연이 마케팅 표면
    // 최상단을 점유하지 않도록 히어로에서 제외하는 게이트이기도 하다.
    expect(toHeroImageUrl("/posters/concert.svg")).toBeNull();
  });

  it("returns null when the show has no poster", () => {
    expect(toHeroImageUrl(undefined)).toBeNull();
  });

  it("returns null for a path that is already a hero path", () => {
    // 이중 변환을 막는다. /posters/hero/hero/... 같은 경로가 나오면 404다.
    expect(toHeroImageUrl("/posters/hero/city-pop.jpg")).toBeNull();
  });

  it("returns null for paths outside the poster directory", () => {
    expect(toHeroImageUrl("/uploads/evil.jpg")).toBeNull();
    expect(toHeroImageUrl("https://example.com/poster.jpg")).toBeNull();
  });
});

describe("toHeroSlides", () => {
  const withPoster = (id: string, slug: string): Show => ({
    id,
    title: `공연 ${id}`,
    description: "설명",
    posterUrl: `/posters/${slug}.jpg`,
  });

  it("maps shows with seed posters to slides", () => {
    const slides = toHeroSlides([withPoster("show-01", "city-pop")]);

    expect(slides).toEqual([
      {
        id: "show-01",
        title: "공연 show-01",
        heroImageUrl: "/posters/hero/city-pop.jpg",
      },
    ]);
  });

  it("drops shows that have no wide hero image", () => {
    const slides = toHeroSlides([
      withPoster("show-01", "city-pop"),
      { id: "seller-01", title: "셀러 공연", description: "설명", posterUrl: "/posters/concert.svg" },
      { id: "legacy-01", title: "옛 공연", description: "설명" },
    ]);

    expect(slides.map((slide) => slide.id)).toEqual(["show-01"]);
  });

  it("caps the slide count so one loop stays watchable", () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      withPoster(`show-0${index + 1}`, `slug-${index + 1}`),
    );

    expect(toHeroSlides(many)).toHaveLength(HERO_SLIDE_LIMIT);
  });

  it("returns an empty array when no show has a poster", () => {
    // Redis가 옛 시드 데이터를 들고 있으면 실제로 이 경로를 탄다.
    // 히어로가 배경 없이 degrade해야 하며 예외를 던지면 안 된다.
    expect(toHeroSlides([{ id: "show-01", title: "공연", description: "설명" }])).toEqual([]);
  });
});

describe("seed poster assets", () => {
  // 경로 오타는 런타임에 깨진 이미지로만 나타난다. jsdom 테스트는 next/image를
  // 목킹하므로 절대 잡지 못한다. 실제 파일 존재를 여기서 확인한다.
  const publicDir = join(process.cwd(), "public");

  it("has a thumbnail file for every seed show", () => {
    for (const show of MOCK_SHOWS) {
      expect(show.posterUrl).toBeDefined();
      expect(existsSync(join(publicDir, show.posterUrl as string))).toBe(true);
    }
  });

  it("has a wide hero file for every seed show", () => {
    for (const show of MOCK_SHOWS) {
      const heroUrl = toHeroImageUrl(show.posterUrl);

      expect(heroUrl).not.toBeNull();
      expect(existsSync(join(publicDir, heroUrl as string))).toBe(true);
    }
  });

  /*
   * docs/UI_GUIDE.md "포스터 이미지"의 파일당 상한을 강제한다. 존재 여부만
   * 확인하면 상한이 문서에만 남아, 자산을 추가하는 사람이 실효 없는 값으로
   * 취급하고 초과가 누적된다. 히어로는 랜딩 LCP를 직접 좌우한다.
   */
  const THUMBNAIL_LIMIT_BYTES = 150 * 1024;
  const HERO_LIMIT_BYTES = 220 * 1024;

  it("keeps every thumbnail within the documented budget", () => {
    for (const show of MOCK_SHOWS) {
      const path = join(publicDir, show.posterUrl as string);

      expect(statSync(path).size).toBeLessThanOrEqual(THUMBNAIL_LIMIT_BYTES);
    }
  });

  it("keeps every hero image within the documented budget", () => {
    for (const show of MOCK_SHOWS) {
      const path = join(publicDir, toHeroImageUrl(show.posterUrl) as string);

      expect(statSync(path).size).toBeLessThanOrEqual(HERO_LIMIT_BYTES);
    }
  });
});
