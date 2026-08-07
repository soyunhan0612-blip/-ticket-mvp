import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/shows", () => {
  it("returns all shows", async () => {
    const response = await GET();
    const body = (await response.json()) as { shows: unknown[] };

    expect(response.status).toBe(200);
    expect(body.shows).toHaveLength(8);
  });
});
