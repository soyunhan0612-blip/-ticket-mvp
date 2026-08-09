import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hasRedisConfig", () => {
  it("returns true only when both Upstash environment variables are present", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");

    const { hasRedisConfig } = await import("./redis-client");

    expect(hasRedisConfig()).toBe(true);
  });

  it.each([
    [undefined, undefined],
    ["https://example.upstash.io", undefined],
    [undefined, "test-token"],
    ["", "test-token"],
    ["https://example.upstash.io", ""],
  ])("returns false when either variable is missing or empty", async (url, token) => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", url);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", token);

    const { hasRedisConfig } = await import("./redis-client");

    expect(hasRedisConfig()).toBe(false);
  });
});

describe("getRedisClient", () => {
  it("does not throw while importing the module without Upstash configuration", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    await expect(import("./redis-client")).resolves.toBeDefined();
  });

  it("throws a clear error when configuration is missing", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    const { getRedisClient } = await import("./redis-client");

    expect(() => getRedisClient()).toThrowError(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be configured",
    );
  });

  it("returns the same client instance across calls", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { getRedisClient } = await import("./redis-client");

    expect(getRedisClient()).toBe(getRedisClient());
  });
});
