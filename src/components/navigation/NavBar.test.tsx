import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NavBar } from "./NavBar";

describe("NavBar", () => {
  it("작은 화면에서는 브랜드와 메뉴를 두 줄로 배치한다", () => {
    render(<NavBar />);

    const navigation = screen.getByRole("navigation", { name: "주요 메뉴" });
    const container = navigation.firstElementChild;
    const menu = within(navigation).getByRole("list");

    expect(container).toHaveClass("flex-col", "items-start", "sm:flex-row");
    expect(menu).toHaveClass(
      "w-full",
      "justify-between",
      "sm:w-auto",
      "sm:justify-start",
    );
  });

  it("모든 주요 경로를 계속 노출한다", () => {
    render(<NavBar />);

    expect(screen.getByRole("link", { name: "티켓 MVP" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "공연" })).toHaveAttribute("href", "/shows");
    expect(screen.getByRole("link", { name: "공연 등록" })).toHaveAttribute(
      "href",
      "/seller/new",
    );
    expect(screen.getByRole("link", { name: "내 예매" })).toHaveAttribute(
      "href",
      "/reservations",
    );
  });
});
