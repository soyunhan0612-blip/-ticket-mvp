import { describe, expect, it } from "vitest";

import { getUserIdFromRequest } from "./cookie";

describe("getUserIdFromRequest", () => {
  it("returns the userId value from the Cookie header", () => {
    const request = new Request("http://localhost", {
      headers: { cookie: "userId=user-123" },
    });

    expect(getUserIdFromRequest(request)).toBe("user-123");
  });

  it("returns null when the Cookie header has no userId", () => {
    const request = new Request("http://localhost", {
      headers: { cookie: "theme=dark" },
    });

    expect(getUserIdFromRequest(request)).toBeNull();
  });

  it("returns null when the Cookie header is absent", () => {
    const request = new Request("http://localhost");

    expect(getUserIdFromRequest(request)).toBeNull();
  });

  it("returns null when userId is empty", () => {
    const request = new Request("http://localhost", {
      headers: { cookie: "userId=" },
    });

    expect(getUserIdFromRequest(request)).toBeNull();
  });

  it("parses only userId when multiple cookies are present", () => {
    const request = new Request("http://localhost", {
      headers: { cookie: "theme=dark; userId=user-456; locale=ko" },
    });

    expect(getUserIdFromRequest(request)).toBe("user-456");
  });
});
