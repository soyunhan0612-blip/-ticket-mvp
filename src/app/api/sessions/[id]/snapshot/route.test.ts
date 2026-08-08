import { describe, expect, it } from "vitest";

import { getSeatStore } from "@/services";
import type { SeatSnapshot } from "@/types";

import { GET } from "./route";

function makeRequest(sessionId: string, userId?: string): Request {
  return new Request(`http://localhost/api/sessions/${sessionId}/snapshot`, {
    headers: userId ? { Cookie: `userId=${userId}` } : {},
  });
}

function makeContext(sessionId: string) {
  return { params: Promise.resolve({ id: sessionId }) };
}

describe("GET /api/sessions/[id]/snapshot", () => {
  it("returns an empty snapshot for an empty session", async () => {
    const sessionId = "route-snapshot-empty";

    const response = await GET(
      makeRequest(sessionId, "test-user-1"),
      makeContext(sessionId),
    );
    const body = (await response.json()) as SeatSnapshot;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      version: expect.any(Number),
      serverNow: expect.any(Number),
      seats: {},
    });
  });

  it("marks the requesting user's held seat as mine", async () => {
    const sessionId = "route-snapshot-own";
    await getSeatStore().hold(sessionId, ["A-1-1"], "owner");

    const response = await GET(
      makeRequest(sessionId, "owner"),
      makeContext(sessionId),
    );
    const body = (await response.json()) as SeatSnapshot;

    expect(response.status).toBe(200);
    expect(body.seats["A-1-1"]).toMatchObject({
      s: "held",
      mine: true,
      expiresAt: expect.any(Number),
    });
  });

  it("does not expose ownership for another user's held seat", async () => {
    const sessionId = "route-snapshot-other";
    await getSeatStore().hold(sessionId, ["A-1-1"], "owner");

    const response = await GET(
      makeRequest(sessionId, "other-user"),
      makeContext(sessionId),
    );
    const body = (await response.json()) as SeatSnapshot;

    expect(response.status).toBe(200);
    expect(body.seats["A-1-1"]).toMatchObject({
      s: "held",
      expiresAt: expect.any(Number),
    });
    expect(body.seats["A-1-1"]).not.toHaveProperty("mine");
    expect(JSON.stringify(body)).not.toContain("owner");
  });

  it("returns 401 without a userId cookie", async () => {
    const sessionId = "route-snapshot-auth";

    const response = await GET(makeRequest(sessionId), makeContext(sessionId));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
  });
});
