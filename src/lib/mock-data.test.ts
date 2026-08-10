import { describe, expect, it } from "vitest";

import { isValidSeatId, TOTAL_SEATS } from "./seat-map";
import {
  compareShowOrder,
  generateSeats,
  MOCK_SESSIONS,
  MOCK_SHOWS,
} from "./mock-data";

describe("mock shows", () => {
  it("contains exactly eight shows with unique IDs", () => {
    expect(MOCK_SHOWS).toHaveLength(8);
    expect(new Set(MOCK_SHOWS.map((show) => show.id)).size).toBe(
      MOCK_SHOWS.length,
    );
  });

  it("keeps descriptions as plain text without angle-bracket tags", () => {
    for (const show of MOCK_SHOWS) {
      expect(show.description).not.toMatch(/[<>]/);
    }
  });

  it("points every show at a local seed poster", () => {
    for (const show of MOCK_SHOWS) {
      expect(show.posterUrl).toMatch(/^\/posters\/[a-z0-9-]+\.jpg$/);
    }
  });

  it("gives each show its own poster so no image repeats", () => {
    const posterUrls = MOCK_SHOWS.map((show) => show.posterUrl);

    expect(new Set(posterUrls).size).toBe(MOCK_SHOWS.length);
  });
});

describe("compareShowOrder", () => {
  it("keeps seeded shows in their authored order", () => {
    const ids = [...MOCK_SHOWS].reverse().sort(compareShowOrder).map((show) => show.id);

    expect(ids).toEqual(MOCK_SHOWS.map((show) => show.id));
  });

  it("puts seller-created shows after every seeded show", () => {
    // 셀러 공연 ID는 UUID다. 단순 문자열 정렬이면 UUID가 "show-"보다 앞서서
    // 임의 등록물이 랜딩 카드 세 자리를 통째로 차지한다.
    const seller = {
      id: "a1b2c3d4-0000-4000-8000-000000000000",
      title: "셀러 공연",
      description: "설명",
    };

    const ids = [seller, ...MOCK_SHOWS].sort(compareShowOrder).map((show) => show.id);

    expect(ids.at(-1)).toBe(seller.id);
    expect(ids[0]).toBe("show-01");
  });

  it("orders seller-created shows among themselves by ID", () => {
    const first = { id: "aaaa", title: "A", description: "설명" };
    const second = { id: "bbbb", title: "B", description: "설명" };

    expect([second, first].sort(compareShowOrder).map((show) => show.id)).toEqual([
      "aaaa",
      "bbbb",
    ]);
  });
});

describe("mock sessions", () => {
  it("contains exactly 24 sessions with unique IDs", () => {
    expect(MOCK_SESSIONS).toHaveLength(24);
    expect(new Set(MOCK_SESSIONS.map((session) => session.id)).size).toBe(
      MOCK_SESSIONS.length,
    );
  });

  it("references an existing show from every session", () => {
    const showIds = new Set(MOCK_SHOWS.map((show) => show.id));

    for (const session of MOCK_SESSIONS) {
      expect(showIds.has(session.showId)).toBe(true);
    }
  });

  it("uses valid ISO 8601 timestamps for every start time", () => {
    for (const session of MOCK_SESSIONS) {
      expect(new Date(session.startsAt).toString()).not.toBe("Invalid Date");
      expect(new Date(session.startsAt).toISOString()).toBe(session.startsAt);
    }
  });
});

describe("generateSeats", () => {
  it("returns all 2,000 seats with unique, valid IDs", () => {
    const seats = generateSeats();
    const seatIds = seats.map((seat) => seat.id);

    expect(seats).toHaveLength(TOTAL_SEATS);
    expect(new Set(seatIds).size).toBe(TOTAL_SEATS);
    expect(seatIds.every(isValidSeatId)).toBe(true);
  });

  it("returns seats in section, row, and column order", () => {
    const seats = generateSeats();

    expect(seats[0]).toEqual({ id: "A-1-1", section: "A", row: 1, col: 1 });
    expect(seats[19]).toEqual({
      id: "A-1-20",
      section: "A",
      row: 1,
      col: 20,
    });
    expect(seats[20]).toEqual({ id: "A-2-1", section: "A", row: 2, col: 1 });
    expect(seats[500]).toEqual({ id: "B-1-1", section: "B", row: 1, col: 1 });
    expect(seats.at(-1)).toEqual({
      id: "D-25-20",
      section: "D",
      row: 25,
      col: 20,
    });
  });

  it("is deterministic while returning a fresh array each time", () => {
    const first = generateSeats();
    const second = generateSeats();

    expect(second).not.toBe(first);
    expect(second.map((seat) => seat.id)).toEqual(first.map((seat) => seat.id));
  });
});
