import { afterEach, describe, expect, it } from "vitest";

import { POST } from "./route";

function makeRequest(body: unknown, ip: string): Request {
  return new Request("http://localhost/api/ai/description", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/description", () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  it("returns a streaming fallback response when the API key is absent", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const response = await POST(makeRequest({ title: "봄날의 콘서트" }, "fallback-ip"));

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(ReadableStream);
    expect(await response.text()).toContain("봄날의 콘서트");
  });

  it("returns 400 when title is missing", async () => {
    const response = await POST(makeRequest({ genre: "콘서트" }, "missing-title-ip"));

    expect(response.status).toBe(400);
  });

  it("returns 400 when title exceeds 100 characters", async () => {
    const response = await POST(
      makeRequest({ title: "가".repeat(101) }, "long-title-ip"),
    );

    expect(response.status).toBe(400);
  });

  it("returns 429 with Retry-After on the fourth request from one IP", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const ip = "rate-limit-ip";

    await POST(makeRequest({ title: "첫 번째" }, ip));
    await POST(makeRequest({ title: "두 번째" }, ip));
    await POST(makeRequest({ title: "세 번째" }, ip));
    const response = await POST(makeRequest({ title: "네 번째" }, ip));

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("returns a UTF-8 plain text response", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const response = await POST(makeRequest({ title: "연극" }, "content-type-ip"));

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });
});
