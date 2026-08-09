import { describe, expect, it } from "vitest";

import {
  getPosterUrl,
  isValidPosterPresetId,
  POSTER_PRESETS,
} from "./poster-preset";

describe("POSTER_PRESETS", () => {
  it("defines at least three complete poster presets", () => {
    expect(POSTER_PRESETS.length).toBeGreaterThanOrEqual(3);

    for (const preset of POSTER_PRESETS) {
      expect(preset).toEqual({
        id: expect.any(String),
        label: expect.any(String),
        url: expect.any(String),
      });
      expect(preset.id).not.toHaveLength(0);
      expect(preset.label).not.toHaveLength(0);
      expect(preset.url).not.toHaveLength(0);
    }
  });
});

describe("isValidPosterPresetId", () => {
  it("accepts known preset IDs and rejects an unknown ID", () => {
    expect(isValidPosterPresetId("concert")).toBe(true);
    expect(isValidPosterPresetId("musical")).toBe(true);
    expect(isValidPosterPresetId("theater")).toBe(true);
    expect(isValidPosterPresetId("invalid")).toBe(false);
  });
});

describe("getPosterUrl", () => {
  it.each(["concert", "musical", "theater"])(
    "returns a local poster path for %s",
    (id) => {
      expect(getPosterUrl(id)).toMatch(/^\/posters\//);
    },
  );

  it("returns null for an unknown preset ID", () => {
    expect(getPosterUrl("invalid")).toBeNull();
  });
});
