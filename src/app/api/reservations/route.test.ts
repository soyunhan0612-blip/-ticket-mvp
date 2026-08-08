import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as holdPost } from "@/app/api/holds/route";

import { GET, POST } from "./route";

function makeRequest(
  method: "POST" | "GET",
  body?: unknown,
  userId?: string,
): Request {
  return new Request("http://localhost/api/reservations", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function makeHoldRequest(sessionId: string, seatIds: string[], userId: string) {
  return new Request("http://localhost/api/holds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `userId=${userId}`,
    },
    body: JSON.stringify({ sessionId, seatIds }),
  });
}

describe("POST /api/reservations", () => {
  it("creates a reservation from held seats (201)", async () => {
    const sessionId = "res-api-create";
    const userId = "res-api-user-1";
    await holdPost(makeHoldRequest(sessionId, ["A-1-1", "A-1-2"], userId));

    const response = await POST(
      makeRequest("POST", { sessionId, seatIds: ["A-1-1", "A-1-2"] }, userId),
    );
    const body = await response.json() as { reservation: Record<string, unknown> };

    expect(response.status).toBe(201);
    expect(body.reservation).toMatchObject({
      id: expect.any(String),
      sessionId,
      seatIds: ["A-1-1", "A-1-2"],
      status: "confirmed",
      createdAt: expect.any(Number),
    });
  });

  it("does not include userId in response", async () => {
    const sessionId = "res-api-no-uid";
    const userId = "res-api-user-2";
    await holdPost(makeHoldRequest(sessionId, ["A-1-1"], userId));

    const response = await POST(
      makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, userId),
    );
    const body = await response.json() as { reservation: Record<string, unknown> };

    expect(body.reservation).not.toHaveProperty("userId");
  });

  it("returns 401 without a userId cookie", async () => {
    const response = await POST(
      makeRequest("POST", { sessionId: "res-api-auth", seatIds: ["A-1-1"] }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for a malformed body", async () => {
    const missing = await POST(makeRequest("POST", undefined, "test-user"));
    const malformed = await POST(
      makeRequest("POST", { sessionId: "", seatIds: "A-1-1" }, "test-user"),
    );

    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
  });

  it("returns 400 for empty seatIds", async () => {
    const response = await POST(
      makeRequest("POST", { sessionId: "res-api-empty", seatIds: [] }, "test-user"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for more than 4 seats", async () => {
    const response = await POST(
      makeRequest(
        "POST",
        { sessionId: "res-api-limit", seatIds: ["A-1-1", "A-1-2", "A-1-3", "A-1-4", "A-1-5"] },
        "test-user",
      ),
    );
    expect(response.status).toBe(400);
  });

  it("returns 410 for expired hold", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T00:00:00.000Z"));
    const sessionId = "res-api-expired";
    const userId = "res-api-user-3";
    await holdPost(makeHoldRequest(sessionId, ["A-1-1"], userId));

    vi.advanceTimersByTime(300_001);

    const response = await POST(
      makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, userId),
    );
    vi.useRealTimers();

    expect(response.status).toBe(410);
  });

  it("returns 403 for another user's hold", async () => {
    const sessionId = "res-api-forbidden";
    await holdPost(makeHoldRequest(sessionId, ["A-1-1"], "owner-user"));

    const response = await POST(
      makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, "other-user"),
    );
    expect(response.status).toBe(403);
  });
});

describe("GET /api/reservations", () => {
  it("returns the user's reservations (200)", async () => {
    const sessionId = "res-api-list";
    const userId = "res-api-list-user";
    await holdPost(makeHoldRequest(sessionId, ["A-1-1"], userId));
    await POST(makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, userId));

    const response = await GET(makeRequest("GET", undefined, userId));
    const body = await response.json() as { reservations: Record<string, unknown>[] };

    expect(response.status).toBe(200);
    expect(body.reservations.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 401 without a userId cookie", async () => {
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(401);
  });

  it("does not include userId in each reservation", async () => {
    const sessionId = "res-api-list-nuid";
    const userId = "res-api-list-nuid-user";
    await holdPost(makeHoldRequest(sessionId, ["A-1-1"], userId));
    await POST(makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, userId));

    const response = await GET(makeRequest("GET", undefined, userId));
    const body = await response.json() as { reservations: Record<string, unknown>[] };

    for (const r of body.reservations) {
      expect(r).not.toHaveProperty("userId");
    }
  });
});
