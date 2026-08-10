import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShowCard } from "./ShowCard";
import type { Show } from "@/types";

const SHOW: Show = {
  id: "show-01",
  title: "여름밤 시티 팝 콘서트",
  description:
    "도시의 야경과 어울리는 시티 팝 명곡을 밴드의 풍성한 라이브 사운드로 만나는 공연입니다.",
  posterUrl: "/posters/city-pop.jpg",
};

const SIZES = "(min-width: 768px) 33vw, 100vw";

function renderCard(show: Show = SHOW, headingLevel: 2 | 3 = 3) {
  return render(
    <ShowCard headingLevel={headingLevel} show={show} sizes={SIZES} />,
  );
}

describe("ShowCard", () => {
  it("makes the whole card a link to the show detail page", () => {
    renderCard();

    expect(screen.getByRole("link")).toHaveAttribute("href", "/shows/show-01");
  });

  it("shows the title once so it is not read twice", () => {
    renderCard();

    expect(screen.getAllByRole("heading", { name: SHOW.title })).toHaveLength(1);
    expect(screen.getByText(SHOW.description)).toBeInTheDocument();
  });

  it("lays the title over the poster instead of below it", () => {
    const { container } = renderCard();

    const poster = container.querySelector(".aspect-\\[3\\/4\\]");
    const heading = screen.getByRole("heading", { name: SHOW.title });

    expect(poster).not.toBeNull();
    expect(poster).toContainElement(heading);
  });

  it("tints only the bottom band, not the whole poster", () => {
    // 포스터 전체를 덮으면 카드가 dark 표면이 되어 "dark 히어로 → light 카드"
    // 극성 반전이 카드 안에서 뒤집힌다. 밴드 정책이 만든 깊이가 사라진다.
    const { container } = renderCard();

    const tint = container.querySelector(".bg-ink");

    expect(tint).toHaveClass("opacity-[0.72]");
    expect(tint?.parentElement).toHaveClass("inset-x-0", "bottom-0");
    expect(tint?.parentElement).not.toHaveClass("inset-0");
  });

  it("caps a long title at two lines so the band cannot swallow the poster", () => {
    renderCard({ ...SHOW, title: "아주 긴 제목이 들어와도 띠가 포스터를 삼키지 않아야 하는 공연" });

    expect(screen.getByRole("heading")).toHaveClass("line-clamp-2");
  });

  it("keeps the poster alt empty because the title sits beside it", () => {
    const { container } = renderCard();

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("renders the title as plain text when the show has no poster", () => {
    // 셀러 등록물이나 옛 Redis 데이터. 제목이 사라지면 설명만 남은 익명 블록이 된다.
    const { container } = renderCard({ ...SHOW, posterUrl: undefined });

    expect(screen.getByRole("heading", { name: SHOW.title })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".bg-ink")).toBeNull();
  });

  it("follows the heading level the page asks for", () => {
    const { unmount } = renderCard(SHOW, 3);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    unmount();

    renderCard(SHOW, 2);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});
