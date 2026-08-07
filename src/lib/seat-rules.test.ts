import { describe, expect, it } from "vitest";

import {
  canSelect,
  MAX_SEATS_PER_HOLD,
  validateSelection,
} from "./seat-rules";

describe("MAX_SEATS_PER_HOLD", () => {
  it("limits a hold to four seats", () => {
    expect(MAX_SEATS_PER_HOLD).toBe(4);
  });
});

describe("canSelect", () => {
  it("allows a valid seat when the current selection is empty", () => {
    expect(canSelect([], "A-1-1")).toBe(true);
  });

  it("rejects a seat that is already selected", () => {
    expect(canSelect(["A-1-1"], "A-1-1")).toBe(false);
  });

  it("allows the fourth seat but rejects a fifth seat", () => {
    expect(canSelect(["A-1-1", "A-1-2", "A-1-3"], "A-1-4")).toBe(
      true,
    );
    expect(
      canSelect(["A-1-1", "A-1-2", "A-1-3", "A-1-4"], "A-1-5"),
    ).toBe(false);
  });

  it("rejects an invalid seat id", () => {
    expect(canSelect([], "E-1-1")).toBe(false);
  });
});

describe("validateSelection", () => {
  it("rejects an empty selection", () => {
    expect(validateSelection([])).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects a selection over the hold limit", () => {
    expect(
      validateSelection(["A-1-1", "A-1-2", "A-1-3", "A-1-4", "A-1-5"]),
    ).toEqual({ ok: false, reason: "over-limit" });
  });

  it("rejects duplicate seat ids", () => {
    expect(validateSelection(["A-1-1", "A-1-1"])).toEqual({
      ok: false,
      reason: "duplicate",
    });
  });

  it("rejects a selection containing an invalid seat id", () => {
    expect(validateSelection(["A-1-1", "A-26-1"])).toEqual({
      ok: false,
      reason: "invalid-seat-id",
    });
  });

  it.each([
    ["A-1-1"],
    ["A-1-1", "B-2-2"],
    ["A-1-1", "B-2-2", "C-3-3"],
    ["A-1-1", "B-2-2", "C-3-3", "D-4-4"],
  ])("accepts a valid selection of one to four seats", (...seatIds) => {
    expect(validateSelection(seatIds)).toEqual({ ok: true });
  });

  it("checks empty before later validation reasons", () => {
    expect(validateSelection([])).toEqual({ ok: false, reason: "empty" });
  });
});
