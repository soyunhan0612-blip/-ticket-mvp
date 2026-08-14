import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginDialog } from "./LoginDialog";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

function mockFetch(response: { ok: boolean; status: number }) {
  const fetchMock = vi.fn().mockResolvedValue(response as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function submit(username: string, password: string) {
  await userEvent.type(screen.getByLabelText("사용자명"), username);
  await userEvent.type(screen.getByLabelText("비밀번호"), password);
  await userEvent.click(screen.getByRole("button", { name: "로그인" }));
}

describe("LoginDialog", () => {
  beforeEach(() => {
    router.refresh.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("자격증명을 JSON으로 보내고 성공하면 현재 경로를 다시 렌더한다", async () => {
    const fetchMock = mockFetch({ ok: true, status: 200 });
    render(<LoginDialog />);

    await submit("seller", "secret");

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "seller", password: "secret" }),
    });
    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
  });

  it("401이면 에러를 알리고 화면을 넘기지 않는다", async () => {
    mockFetch({ ok: false, status: 401 });
    render(<LoginDialog />);

    await submit("seller", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "사용자명 또는 비밀번호가 올바르지 않습니다.",
    );
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("429면 시도 횟수 초과를 따로 알린다", async () => {
    mockFetch({ ok: false, status: 429 });
    render(<LoginDialog />);

    await submit("seller", "secret");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "시도가 너무 잦습니다",
    );
  });

  it("비밀번호 필드를 평문으로 노출하지 않는다", () => {
    render(<LoginDialog />);

    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("type", "password");
  });

  it("닫을 수 없는 다이얼로그지만 홈으로 나갈 길은 남긴다", () => {
    render(<LoginDialog />);

    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
