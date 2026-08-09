import { afterEach, describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first three requests and blocks the fourth", () => {
    vi.setSystemTime(1_000);
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

    expect(limiter.check("same-ip")).toEqual({ allowed: true });
    expect(limiter.check("same-ip")).toEqual({ allowed: true });
    expect(limiter.check("same-ip")).toEqual({ allowed: true });

    const blocked = limiter.check("same-ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows requests again after one minute", () => {
    vi.setSystemTime(1_000);
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });
    limiter.check("same-ip");

    vi.setSystemTime(61_001);

    expect(limiter.check("same-ip")).toEqual({ allowed: true });
  });

  it("limits different keys independently", () => {
    vi.setSystemTime(1_000);
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    expect(limiter.check("first-ip").allowed).toBe(true);
    expect(limiter.check("first-ip").allowed).toBe(false);
    expect(limiter.check("second-ip").allowed).toBe(true);
  });

  it("removes stale timestamps while retaining recent ones", () => {
    vi.setSystemTime(0);
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });
    limiter.check("same-ip");
    vi.setSystemTime(30_000);
    limiter.check("same-ip");

    vi.setSystemTime(60_001);

    expect(limiter.check("same-ip")).toEqual({ allowed: true });
    expect(limiter.check("same-ip").allowed).toBe(false);
  });
});
