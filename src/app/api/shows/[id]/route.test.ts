import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/shows/[id]", () => {
  it("returns a show with only its sessions", async () => {
    const id = "show-01";
    const response = await GET(
      new Request(`http://localhost/api/shows/${id}`),
      { params: Promise.resolve({ id }) },
    );
    const body = (await response.json()) as {
      show: { id: string };
      sessions: { showId: string }[];
    };

    expect(response.status).toBe(200);
    expect(body.show.id).toBe(id);
    expect(body.sessions).not.toHaveLength(0);
    expect(body.sessions.every((session) => session.showId === id)).toBe(true);
  });

  it("returns 404 for an unknown show", async () => {
    const id = "nonexistent-id";
    const response = await GET(
      new Request(`http://localhost/api/shows/${id}`),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not found" });
  });
});
