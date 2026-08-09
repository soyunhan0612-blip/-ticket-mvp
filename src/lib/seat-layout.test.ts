import { describe, expect, it } from "vitest";

import {
  SEAT_AREA_TOP,
  SEAT_PITCH,
  SECTION_GAP,
  getInitialViewBox,
  getLayoutBox,
  getSeatPosition,
} from "./seat-layout";
import { COLS_PER_ROW, ROWS_PER_SECTION } from "./seat-map";
import { SEAT_PRESETS, generateSeatsForPreset } from "./seat-preset";
import type { Seat } from "@/types";

const SECTION_WIDTH = COLS_PER_ROW * SEAT_PITCH;
const SECTION_HEIGHT = ROWS_PER_SECTION * SEAT_PITCH;

function seat(section: Seat["section"], row: number, col: number): Seat {
  return { id: `${section}-${row}-${col}`, section, row, col };
}

describe("getLayoutBox", () => {
  it("lays out one section in one column", () => {
    expect(getLayoutBox(["A"])).toEqual({
      width: SECTION_WIDTH,
      height: SEAT_AREA_TOP + SECTION_HEIGHT,
    });
  });

  it("lays out two sections in two columns", () => {
    expect(getLayoutBox(["A", "B"])).toEqual({
      width: SECTION_WIDTH * 2 + SECTION_GAP,
      height: SEAT_AREA_TOP + SECTION_HEIGHT,
    });
  });

  it("lays out four sections in a two-by-two grid", () => {
    expect(getLayoutBox(["A", "B", "C", "D"])).toEqual({
      width: SECTION_WIDTH * 2 + SECTION_GAP,
      height: SEAT_AREA_TOP + SECTION_HEIGHT * 2 + SECTION_GAP,
    });
  });
});

describe("getSeatPosition", () => {
  it("moves by one seat pitch within a section", () => {
    const sections = ["A"] as const;
    const origin = getSeatPosition(seat("A", 1, 1), sections);

    expect(getSeatPosition(seat("A", 1, 2), sections).x - origin.x).toBe(
      SEAT_PITCH,
    );
    expect(getSeatPosition(seat("A", 2, 1), sections).y - origin.y).toBe(
      SEAT_PITCH,
    );
  });

  it("preserves the existing four-section coordinates", () => {
    const sections = ["A", "B", "C", "D"] as const;

    expect(getSeatPosition(seat("A", 1, 1), sections)).toEqual({
      x: 0,
      y: SEAT_AREA_TOP,
    });
    expect(getSeatPosition(seat("D", 1, 1), sections)).toEqual({
      x: SECTION_WIDTH + SECTION_GAP,
      y: SEAT_AREA_TOP + SECTION_HEIGHT + SECTION_GAP,
    });
  });

  it("rejects a seat whose section is absent from the layout", () => {
    expect(() => getSeatPosition(seat("B", 1, 1), ["A"])).toThrow(
      RangeError,
    );
  });

  it.each(SEAT_PRESETS)("keeps every $id preset seat inside its box", (preset) => {
    const box = getLayoutBox(preset.sections);

    for (const candidate of generateSeatsForPreset(preset.id)) {
      const position = getSeatPosition(candidate, preset.sections);
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThan(box.width);
      expect(position.y).toBeLessThan(box.height);
    }
  });
});

describe("getInitialViewBox", () => {
  it("returns a smaller, horizontally centered box attached to the stage side", () => {
    const box = getLayoutBox(["A", "B", "C", "D"]);
    const viewBox = getInitialViewBox(box);

    expect(viewBox.width).toBeLessThan(box.width);
    expect(viewBox.height).toBeLessThan(box.height);
    expect(viewBox.x + viewBox.width / 2).toBe(box.width / 2);
    expect(viewBox.y).toBe(0);
  });
});
