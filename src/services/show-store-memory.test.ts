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

  it("does not implement show creation before Day 8", async () => {
    const store = createShowStoreMemory();

    await expect(store.create({})).rejects.toThrow(
      "ShowStore.create — Day 8 스코프",
    );
  });
});
