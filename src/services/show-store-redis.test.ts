import { beforeEach, describe, expect, it, vi } from "vitest";

type Hashes = Map<string, Map<string, unknown>>;

const hashes: Hashes = new Map();
let seedShowWrites = 0;

function hash(key: string): Map<string, unknown> {
  let value = hashes.get(key);
  if (!value) {
    value = new Map();
    hashes.set(key, value);
  }
  return value;
}

const redis = {
  async hget<T>(key: string, field: string): Promise<T | null> {
    return (hash(key).get(field) as T | undefined) ?? null;
  },
  async hgetall<T>(key: string): Promise<T | null> {
    // 실제 Redis 해시는 필드 순서를 보장하지 않는다. Map의 삽입 순서를 그대로
    // 흘려보내면 목이 우연히 정렬돼 있어 순서 의존 버그를 숨긴다. 뒤집어서
    // 돌려줘 호출자가 스스로 정렬하도록 강제한다.
    const entries = [...hash(key).entries()].reverse();
    return (entries.length === 0 ? null : Object.fromEntries(entries)) as T | null;
  },
  async hset(key: string, values: Record<string, unknown>): Promise<number> {
    if (key === "shows" && Object.hasOwn(values, "show-01")) seedShowWrites += 1;
    const target = hash(key);
    let added = 0;
    for (const [field, value] of Object.entries(values)) {
      if (!target.has(field)) added += 1;
      target.set(field, value);
    }
    return added;
  },
};

vi.mock("./redis-client", () => ({ getRedisClient: () => redis }));

import { createShowStoreRedis } from "./show-store-redis";

const validInput = {
  title: "새 공연",
  description: "새 공연 설명",
  posterUrl: "/posters/new-show.jpg",
  presetId: "medium",
  sessions: ["2026-11-01T10:00:00.000Z", "2026-11-02T10:00:00.000Z"],
};

describe("ShowStoreRedis", () => {
  beforeEach(() => {
    hashes.clear();
    seedShowWrites = 0;
  });

  it("lists all eight seeded shows with unique IDs", async () => {
    const shows = await createShowStoreRedis().list();

    expect(shows).toHaveLength(8);
    expect(new Set(shows.map((show) => show.id)).size).toBe(8);
  });

  it("lists seeded shows in a stable ID order", async () => {
    // hgetall은 삽입 순서를 보장하지 않는다. 정렬하지 않으면 랜딩 히어로와
    // 카드에 노출되는 공연이 배포마다 달라진다 — 마케팅 표면의 첫인상이
    // 저장소 구현에 흔들리면 안 된다.
    const shows = await createShowStoreRedis().list();
    const ids = shows.map((show) => show.id);

    expect(ids).toEqual([...ids].sort());
    expect(ids[0]).toBe("show-01");
  });

  it("keeps seeded shows ahead of seller-created ones", async () => {
    // 셀러 공연 ID는 UUID다. 단순 문자열 정렬이면 UUID가 "show-"보다 앞서서
    // 임의 등록물이 랜딩 카드 세 자리를 통째로 차지한다.
    const store = createShowStoreRedis();
    await store.create(validInput);

    const shows = await store.list();

    expect(shows.slice(0, 8).map((show) => show.id)).toEqual([
      "show-01",
      "show-02",
      "show-03",
      "show-04",
      "show-05",
      "show-06",
      "show-07",
      "show-08",
    ]);
    expect(shows.at(-1)?.title).toBe(validInput.title);
  });

  it("gets a show with only its sessions", async () => {
    const result = await createShowStoreRedis().get("show-01");

    expect(result?.show.id).toBe("show-01");
    expect(result?.sessions).not.toHaveLength(0);
    expect(result?.sessions.every((session) => session.showId === "show-01")).toBe(true);
  });

  it("returns null for unknown shows and sessions", async () => {
    const store = createShowStoreRedis();

    await expect(store.get("nonexistent-id")).resolves.toBeNull();
    await expect(store.getBySessionId("nonexistent-id")).resolves.toBeNull();
  });

  it("finds a seeded show when getBySessionId is the first read", async () => {
    const result = await createShowStoreRedis().getBySessionId("session-01");

    expect(result?.show.id).toBe("show-01");
    expect(result?.session.id).toBe("session-01");
  });

  it("keeps seed injection idempotent across store instances", async () => {
    await createShowStoreRedis().list();
    const shows = await createShowStoreRedis().list();

    expect(shows).toHaveLength(8);
  });

  it("skips seed writes when Redis already holds the seeded shows", async () => {
    await createShowStoreRedis().list();
    expect(seedShowWrites).toBe(1);

    // A fresh instance stands in for a new serverless container: the in-memory
    // seedPromise is gone, but Redis already carries the seed.
    const shows = await createShowStoreRedis().list();

    expect(seedShowWrites).toBe(1);
    expect(shows).toHaveLength(8);
  });

  it("does not remove seller-created shows when another instance seeds", async () => {
    const created = await createShowStoreRedis().create(validInput);

    const shows = await createShowStoreRedis().list();

    expect(shows).toHaveLength(9);
    expect(shows).toContainEqual(created.show);
  });

  it("creates a show, lists it, and resolves its generated sessions directly", async () => {
    const store = createShowStoreRedis();
    const result = await store.create(validInput);

    expect(result.show.id).toEqual(expect.any(String));
    expect(result.show.presetId).toBe("medium");
    expect(result.sessions).toHaveLength(2);
    await expect(store.get(result.show.id)).resolves.toEqual(result);
    await expect(store.getBySessionId(result.sessions[0]!.id)).resolves.toEqual({
      show: result.show,
      session: result.sessions[0],
    });
    await expect(store.list()).resolves.toContainEqual(result.show);
  });

  it.each([
    { ...validInput, title: "" },
    { ...validInput, title: "가".repeat(101) },
    { ...validInput, presetId: "invalid" },
  ])("rejects invalid create input %#", async (input) => {
    await expect(createShowStoreRedis().create(input)).rejects.toThrow();
  });

  it("shares one seed promise across simultaneous reads on an instance", async () => {
    const store = createShowStoreRedis();

    await Promise.all([store.list(), store.get("show-01"), store.getBySessionId("session-01")]);

    expect(seedShowWrites).toBe(1);
  });
});
