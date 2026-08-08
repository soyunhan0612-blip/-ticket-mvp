import { describe, expect, it, vi } from "vitest";

import { createExpiresAt, HOLD_TTL_MS, isExpired } from "./hold";

describe("HOLD_TTL_MS", () => {
  it("defines a five-minute hold", () => {
    expect(HOLD_TTL_MS).toBe(300_000);
  });
});

describe("isExpired", () => {
  it("returns false before expiration", () => {
    expect(isExpired(1_001, 1_000)).toBe(false);
  });

  it("returns true at the exact expiration time", () => {
    expect(isExpired(1_000, 1_000)).toBe(true);
  });

  it("returns true after expiration", () => {
    expect(isExpired(999, 1_000)).toBe(true);
  });

  it("uses Date.now when now is omitted", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);

    expect(isExpired(1_000)).toBe(true);
    expect(isExpired(1_001)).toBe(false);

    vi.restoreAllMocks();
  });
});

describe("createExpiresAt", () => {
  it("adds the hold TTL to the provided time", () => {
    expect(createExpiresAt(1_000)).toBe(1_000 + HOLD_TTL_MS);
  });

  it("uses the current time when now is omitted", () => {
    const before = Date.now();
    const expiresAt = createExpiresAt();
    const after = Date.now();

    expect(expiresAt).toBeGreaterThanOrEqual(before + HOLD_TTL_MS);
    expect(expiresAt).toBeLessThanOrEqual(after + HOLD_TTL_MS);
  });
});
