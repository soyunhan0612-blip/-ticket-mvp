import { describe, expect, it } from "vitest";

import { isProtectedPath, verifyBasicAuth } from "@/lib/basic-auth";

function basicAuthorization(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

describe("verifyBasicAuth", () => {
  it("올바른 credentials의 Authorization 헤더를 통과시킨다", () => {
    expect(verifyBasicAuth(basicAuthorization("seller", "secret"), "seller", "secret")).toEqual({
      authenticated: true,
    });
  });

  it("잘못된 비밀번호를 거부한다", () => {
    expect(verifyBasicAuth(basicAuthorization("seller", "wrong"), "seller", "secret")).toEqual({
      authenticated: false,
    });
  });

  it("Authorization 헤더가 없으면 거부한다", () => {
    expect(verifyBasicAuth(null, "seller", "secret")).toEqual({ authenticated: false });
  });

  it("Basic 이외의 인증 스킴을 거부한다", () => {
    expect(verifyBasicAuth("Bearer token", "seller", "secret")).toEqual({ authenticated: false });
  });

  it("잘못된 base64 인코딩을 거부한다", () => {
    expect(verifyBasicAuth("Basic !!!not-base64!!!", "seller", "secret")).toEqual({
      authenticated: false,
    });
  });

  it.each([
    [undefined, "secret"],
    ["seller", undefined],
  ])("expected credential이 undefined면 거부한다", (expectedUser, expectedPass) => {
    expect(
      verifyBasicAuth(basicAuthorization("seller", "secret"), expectedUser, expectedPass),
    ).toEqual({ authenticated: false });
  });

  it("expectedUser가 빈 문자열이면 거부한다", () => {
    expect(verifyBasicAuth(basicAuthorization("", "secret"), "", "secret")).toEqual({
      authenticated: false,
    });
  });

  it("expectedPass가 빈 문자열이면 거부한다", () => {
    expect(verifyBasicAuth(basicAuthorization("seller", ""), "seller", "")).toEqual({
      authenticated: false,
    });
  });

  it("빈 사용자명과 빈 비밀번호를 담은 Basic 인증을 거부한다", () => {
    expect(verifyBasicAuth("Basic Og==", "", "")).toEqual({ authenticated: false });
  });
});

describe("isProtectedPath", () => {
  it.each([
    "/seller/new",
    "/admin",
    "/admin/dashboard",
    "/api/admin",
    "/api/admin/stats",
  ])("%s를 보호한다", (pathname) => {
    expect(isProtectedPath(pathname)).toBe(true);
  });

  it.each(["/shows", "/api/shows", "/api/holds"])(
    "%s를 보호하지 않는다",
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false);
    },
  );
});
