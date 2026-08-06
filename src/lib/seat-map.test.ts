import { describe, expect, it } from "vitest";

import {
  COLS_PER_ROW,
  isValidSeatId,
  parseSeatId,
  ROWS_PER_SECTION,
  SEATS_PER_SECTION,
  SECTIONS,
  type Section,
  toSeatId,
  TOTAL_SEATS,
} from "./seat-map";

describe("seat map constants", () => {
  it("defines four 500-seat sections and 2,000 seats in total", () => {
    expect(SECTIONS).toEqual(["A", "B", "C", "D"]);
    expect(ROWS_PER_SECTION).toBe(25);
    expect(COLS_PER_ROW).toBe(20);
    expect(SEATS_PER_SECTION).toBe(500);
    expect(TOTAL_SEATS).toBe(2_000);
  });
});

describe("toSeatId", () => {
  it.each([
    ["A", 1, 1, "A-1-1"],
    ["C", 13, 10, "C-13-10"],
    ["D", 25, 20, "D-25-20"],
  ] satisfies Array<[Section, number, number, string]>) (
    "formats section %s row %i column %i",
    (section, row, col, expected) => {
      expect(toSeatId(section, row, col)).toBe(expected);
    },
  );

  it.each([
    ["unknown section", "E" as Section, 1, 1],
    ["row below range", "A" as Section, 0, 1],
    ["row above range", "A" as Section, 26, 1],
    ["column below range", "A" as Section, 1, 0],
    ["column above range", "A" as Section, 1, 21],
  ])("throws for an %s", (_case, section, row, col) => {
    expect(() => toSeatId(section, row, col)).toThrow();
  });
});

describe("parseSeatId", () => {
  it("round-trips every valid section, row, and column", () => {
    for (const section of SECTIONS) {
      for (let row = 1; row <= ROWS_PER_SECTION; row += 1) {
        for (let col = 1; col <= COLS_PER_ROW; col += 1) {
          expect(parseSeatId(toSeatId(section, row, col))).toEqual({
            section,
            row,
            col,
          });
        }
      }
    }
  });

  it.each([
    "A_1_1",
    "A-01-1",
    "A-1-01",
    "A-26-1",
    "A-1-21",
    "",
    "E-1-1",
    "A-1",
    "A-1-1-1",
  ])("returns null for invalid input %j", (seatId) => {
    expect(parseSeatId(seatId)).toBeNull();
  });
});

describe("isValidSeatId", () => {
  it.each(["A-1-1", "D-25-20", "A-01-1", "A-1-21", "E-1-1", ""]) (
    "is equivalent to parseSeatId for %j",
    (seatId) => {
      expect(isValidSeatId(seatId)).toBe(parseSeatId(seatId) !== null);
    },
  );
});
