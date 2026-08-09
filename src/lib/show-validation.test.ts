import { describe, expect, it } from "vitest";

import { createShowInputSchema } from "./show-validation";

const validInput = {
  title: "새 공연",
  description: "새 공연 설명",
  posterUrl: "/posters/new-show.jpg",
  presetId: "medium",
  sessions: ["2026-11-01T10:00:00.000Z"],
};

describe("createShowInputSchema", () => {
  it("accepts valid input", () => {
    expect(createShowInputSchema.safeParse(validInput).success).toBe(true);
  });

  it.each([
    ["an empty title", { title: "" }],
    ["a title longer than 100 characters", { title: "가".repeat(101) }],
    ["a description longer than 2000 characters", { description: "가".repeat(2001) }],
    ["an invalid preset ID", { presetId: "huge" }],
    ["an empty sessions array", { sessions: [] }],
    ["more than ten sessions", { sessions: Array.from({ length: 11 }, (_, index) => `session-${index}`) }],
    ["an empty poster URL", { posterUrl: "" }],
  ])("rejects %s", (_case, override) => {
    expect(
      createShowInputSchema.safeParse({ ...validInput, ...override }).success,
    ).toBe(false);
  });
});
