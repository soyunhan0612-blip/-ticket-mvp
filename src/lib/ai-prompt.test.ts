import { describe, expect, it } from "vitest";

import { buildDescriptionPrompt } from "./ai-prompt";

describe("buildDescriptionPrompt", () => {
  it("wraps the title in user-input delimiters", () => {
    const prompt = buildDescriptionPrompt({ title: "봄날의 콘서트" });

    expect(prompt).toContain("===USER_INPUT_START===");
    expect(prompt).toContain("공연명: 봄날의 콘서트");
    expect(prompt).toContain("===USER_INPUT_END===");
  });

  it("instructs the model to return plain text without Markdown", () => {
    const prompt = buildDescriptionPrompt({ title: "연극" });

    expect(prompt).toMatch(/마크다운.*사용하지|마크다운 없이/);
    expect(prompt).toContain("일반 텍스트");
  });

  it("truncates titles longer than 100 characters", () => {
    const title = "가".repeat(101);
    const prompt = buildDescriptionPrompt({ title });

    expect(prompt).toContain(`공연명: ${"가".repeat(100)}\n`);
    expect(prompt).not.toContain(title);
  });

  it("includes the genre when provided", () => {
    const prompt = buildDescriptionPrompt({ title: "공연", genre: "뮤지컬" });

    expect(prompt).toContain("장르: 뮤지컬");
  });
});
