import { describe, expect, it } from "vitest";

import { createShowStoreMemory } from "./show-store-memory";

describe("ShowStoreMemory", () => {
  it("lists all eight shows with unique IDs", async () => {
    const store = createShowStoreMemory();

    const shows = await store.list();

    expect(shows).toHaveLength(8);
    expect(new Set(shows.map((show) => show.id)).size).toBe(shows.length);
  });

  it("gets a show with only its sessions", async () => {
    const store = createShowStoreMemory();

    const result = await store.get("show-01");

    expect(result?.show.id).toBe("show-01");
    expect(result?.sessions).not.toHaveLength(0);
    expect(
      result?.sessions.every((session) => session.showId === "show-01"),
    ).toBe(true);
  });

  it("returns null for an unknown show", async () => {
    const store = createShowStoreMemory();

    await expect(store.get("nonexistent-id")).resolves.toBeNull();
  });

  it("finds a show by session ID", async () => {
    const store = createShowStoreMemory();

    const result = await store.getBySessionId("session-01");

    expect(result?.show.id).toBe("show-01");
    expect(result?.session.id).toBe("session-01");
  });

  it("returns null for an unknown session ID", async () => {
    const store = createShowStoreMemory();

    await expect(store.getBySessionId("nonexistent")).resolves.toBeNull();
  });

  it("creates and persists a show with its generated sessions", async () => {
    const store = createShowStoreMemory();
    const startsAtList = [
      "2026-11-01T10:00:00.000Z",
      "2026-11-02T10:00:00.000Z",
    ];

    const result = await store.create({
      title: "새 공연",
      description: "새 공연 설명",
      posterUrl: "/posters/new-show.jpg",
      presetId: "medium",
      sessions: startsAtList,
    });

    expect(result.show.id).toEqual(expect.any(String));
    expect(result.show.id).not.toHaveLength(0);
    expect(result.show.presetId).toBe("medium");
    expect(result.sessions).toHaveLength(startsAtList.length);
    expect(
      result.sessions.every((session) => session.showId === result.show.id),
    ).toBe(true);

    const shows = await store.list();
    expect(shows).toHaveLength(9);
    expect(shows).toContainEqual(result.show);
    await expect(store.get(result.show.id)).resolves.toEqual(result);
  });

  it("orders seller shows by ID so both stores agree", async () => {
    /*
     * Redis 경로는 hgetall 순서를 못 믿어 compareShowOrder로 정렬한다. 메모리가
     * 등록 순서를 그대로 돌려주면 같은 데이터가 저장소에 따라 다른 순서로 보여,
     * 로컬에서 검증한 목록 순서가 프로덕션과 어긋난다. 정렬을 두 구현이 공유하는
     * 계약으로 둔다.
     */
    const store = createShowStoreMemory();
    const sessions = ["2026-12-01T10:00:00.000Z"];

    const first = await store.create({
      title: "먼저 등록",
      description: "먼저 등록한 공연 설명",
      posterUrl: "/posters/first.jpg",
      presetId: "small",
      sessions,
    });
    const second = await store.create({
      title: "나중 등록",
      description: "나중 등록한 공연 설명",
      posterUrl: "/posters/second.jpg",
      presetId: "small",
      sessions,
    });

    const shows = await store.list();
    const sellerIds = shows
      .map((show) => show.id)
      .filter((id) => id === first.show.id || id === second.show.id);

    expect(sellerIds).toEqual(
      [first.show.id, second.show.id].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("keeps seed shows ahead of seller shows in authoring order", async () => {
    const store = createShowStoreMemory();

    const shows = await store.list();
    const seedIds = shows
      .map((show) => show.id)
      .filter((id) => id.startsWith("show-"));

    expect(seedIds).toEqual([...seedIds].sort());
    expect(shows[0]?.id).toBe("show-01");
  });
});
