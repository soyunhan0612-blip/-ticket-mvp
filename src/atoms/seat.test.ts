import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  seatStatusAtomFamily,
  seatVisualStateAtomFamily,
  selectedSeatIdsAtom,
  toggleSeatAtom,
} from "./seat";

describe("selectedSeatIdsAtom", () => {
  it("starts empty and reflects seats added through toggleSeatAtom", () => {
    const store = createStore();

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual(["A-1-1"]);
  });
});

describe("toggleSeatAtom", () => {
  it("adds a valid seat", () => {
    const store = createStore();

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual(["A-1-1"]);
  });

  it("removes an already selected seat", () => {
    const store = createStore();
    store.set(selectedSeatIdsAtom, ["A-1-1"]);

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
  });

  it("ignores a fifth seat when four seats are selected", () => {
    const store = createStore();
    store.set(selectedSeatIdsAtom, ["A-1-1", "A-1-2", "A-1-3", "A-1-4"]);

    store.set(toggleSeatAtom, "A-1-5");

    expect(store.get(selectedSeatIdsAtom)).toEqual([
      "A-1-1",
      "A-1-2",
      "A-1-3",
      "A-1-4",
    ]);
  });

  it("ignores an invalid seat id", () => {
    const store = createStore();

    store.set(toggleSeatAtom, "Z-99-99");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
  });

  it("ignores a seat held by another user", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "held", mine: false });

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
  });

  it("ignores a sold seat", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "sold" });

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual([]);
  });

  it("allows toggling a seat held by the current user", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "held", mine: true });

    store.set(toggleSeatAtom, "A-1-1");

    expect(store.get(selectedSeatIdsAtom)).toEqual(["A-1-1"]);
  });
});

describe("seatVisualStateAtomFamily", () => {
  it("returns available for a seat without server or local state", () => {
    const store = createStore();

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("available");
  });

  it("returns selected for a locally selected seat", () => {
    const store = createStore();
    store.set(selectedSeatIdsAtom, ["A-1-1"]);

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("selected");
  });

  it("maps a held seat owned by the current user to selected", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "held", mine: true });

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("selected");
  });

  it.each([
    ["without mine", { s: "held" }],
    ["with mine false", { s: "held", mine: false }],
  ] as const)("maps a held seat %s to held-other", (_label, status) => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), status);

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("held-other");
  });

  it("maps a sold seat to sold", () => {
    const store = createStore();
    store.set(seatStatusAtomFamily("A-1-1"), { s: "sold" });

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("sold");
  });

  it("prioritizes local selection over held-other server state", () => {
    const store = createStore();
    store.set(selectedSeatIdsAtom, ["A-1-1"]);
    store.set(seatStatusAtomFamily("A-1-1"), { s: "held", mine: false });

    expect(store.get(seatVisualStateAtomFamily("A-1-1"))).toBe("selected");
  });
});
