import { describe, expect, it } from "vitest";

import {
  generateSeatsForPreset,
  generateSessionsForShow,
  isValidPresetId,
  SEAT_PRESETS,
} from "./seat-preset";

describe("SEAT_PRESETS", () => {
  it("defines exactly three presets", () => {
    expect(SEAT_PRESETS).toHaveLength(3);
  });

  it.each([
    ["small", ["A"], 500],
    ["medium", ["A", "B"], 1_000],
    ["large", ["A", "B", "C", "D"], 2_000],
  ] as const)(
    "defines the %s preset",
    (presetId, sections, totalSeats) => {
      expect(SEAT_PRESETS.find(({ id }) => id === presetId)).toMatchObject({
        sections,
        totalSeats,
      });
    },
  );
});

describe("generateSeatsForPreset", () => {
  it.each([
    ["small", ["A"], 500],
    ["medium", ["A", "B"], 1_000],
    ["large", ["A", "B", "C", "D"], 2_000],
  ] as const)(
    "generates only the configured sections for %s",
    (presetId, sections, totalSeats) => {
      const seats = generateSeatsForPreset(presetId);

      expect(seats).toHaveLength(totalSeats);
      expect([...new Set(seats.map(({ section }) => section))]).toEqual(
        sections,
      );
    },
  );
});

describe("isValidPresetId", () => {
  it("accepts a known preset id and rejects an unknown id", () => {
    expect(isValidPresetId("small")).toBe(true);
    expect(isValidPresetId("xxx")).toBe(false);
  });
});

describe("generateSessionsForShow", () => {
  it("creates one unique session per start time for the requested show", () => {
    const startsAtList = [
      "2026-09-04T10:30:00.000Z",
      "2026-09-05T09:00:00.000Z",
      "2026-09-05T11:30:00.000Z",
    ];

    const sessions = generateSessionsForShow("show-new", startsAtList);

    expect(sessions).toHaveLength(startsAtList.length);
    expect(sessions.map(({ startsAt }) => startsAt)).toEqual(startsAtList);
    expect(sessions.every(({ showId }) => showId === "show-new")).toBe(true);
    expect(new Set(sessions.map(({ id }) => id))).toHaveLength(sessions.length);
  });
});
