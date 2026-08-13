import { describe, expect, it } from "vitest";

import { createRenderCounter } from "./render-counter";

describe("createRenderCounter", () => {
  it("starts unknown labels at zero", () => {
    const counter = createRenderCounter();

    expect(counter.countOf("Seat")).toBe(0);
  });

  it("counts repeated bumps for the same label", () => {
    const counter = createRenderCounter();

    counter.bump("Seat");
    counter.bump("Seat");
    counter.bump("Seat");

    expect(counter.countOf("Seat")).toBe(3);
  });

  it("counts different labels independently", () => {
    const counter = createRenderCounter();

    counter.bump("Seat");
    counter.bump("Seat");
    counter.bump("seatVisualStateAtom");

    expect(counter.countOf("Seat")).toBe(2);
    expect(counter.countOf("seatVisualStateAtom")).toBe(1);
  });

  it("keeps separate counter instances isolated", () => {
    const first = createRenderCounter();
    const second = createRenderCounter();

    first.bump("Seat");
    first.bump("Seat");
    second.bump("Seat");

    expect(first.countOf("Seat")).toBe(2);
    expect(second.countOf("Seat")).toBe(1);
  });

  it("clears every count on reset", () => {
    const counter = createRenderCounter();

    counter.bump("Seat");
    counter.bump("seatVisualStateAtom");
    counter.reset();

    expect(counter.countOf("Seat")).toBe(0);
    expect(counter.countOf("seatVisualStateAtom")).toBe(0);
    expect(counter.snapshot()).toEqual({});
    expect(counter.total()).toBe(0);
  });

  it("returns a snapshot that cannot mutate internal counts", () => {
    const counter = createRenderCounter();
    counter.bump("Seat");

    const snapshot = counter.snapshot();
    (snapshot as Record<string, number>).Seat = 99;
    (snapshot as Record<string, number>).Other = 10;

    expect(counter.countOf("Seat")).toBe(1);
    expect(counter.countOf("Other")).toBe(0);
    expect(counter.total()).toBe(1);
  });

  it("totals counts across every label", () => {
    const counter = createRenderCounter();

    counter.bump("Seat");
    counter.bump("Seat");
    counter.bump("seatVisualStateAtom");

    expect(counter.total()).toBe(3);
  });
});
