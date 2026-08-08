import { describe, expect, it } from "vitest";

import { DELETE, POST } from "./route";

function makeRequest(
  method: "POST" | "DELETE",
  body?: unknown,
  userId?: string,
): Request {
  return new Request("http://localhost/api/holds", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("POST /api/holds", () => {
  it("creates a hold without exposing userId", async () => {
    const response = await POST(
      makeRequest(
        "POST",
        { sessionId: "route-post-success", seatIds: ["A-1-1", "A-1-2"] },
        "test-user-1",
      ),
    );
    const body = (await response.json()) as { hold: Record<string, unknown> };

    expect(response.status).toBe(201);
    expect(body.hold).toMatchObject({
      id: expect.any(String),
      sessionId: "route-post-success",
      seatIds: ["A-1-1", "A-1-2"],
      expiresAt: expect.any(Number),
    });
    expect(body.hold).not.toHaveProperty("userId");
  });

  it("returns 401 without a userId cookie", async () => {
    const response = await POST(
      makeRequest("POST", { sessionId: "route-post-auth", seatIds: ["A-1-1"] }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for a missing or malformed body", async () => {
    const missing = await POST(makeRequest("POST", undefined, "test-user-1"));
    const malformed = await POST(
      makeRequest("POST", { sessionId: "", seatIds: "A-1-1" }, "test-user-1"),
    );

    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
  });

  it("returns 400 for an invalid seat ID", async () => {
    const response = await POST(
      makeRequest(
        "POST",
        { sessionId: "route-post-invalid", seatIds: ["Z-99-99"] },
        "test-user-1",
      ),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when more than four seats are requested", async () => {
    const response = await POST(
      makeRequest(
        "POST",
        {
          sessionId: "route-post-limit",
          seatIds: ["A-1-1", "A-1-2", "A-1-3", "A-1-4", "A-1-5"],
        },
        "test-user-1",
      ),
    );

    expect(response.status).toBe(400);
  });

  it("returns 409 with conflicting seat IDs", async () => {
    const sessionId = "route-post-conflict";
    await POST(makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, "owner"));

    const response = await POST(
      makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, "other-user"),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "conflict",
      conflict: ["A-1-1"],
    });
  });

  it("does not partially hold a multi-seat request when one seat conflicts", async () => {
    const sessionId = "route-post-atomic";
    await POST(makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, "owner"));

    const conflict = await POST(
      makeRequest(
        "POST",
        { sessionId, seatIds: ["A-1-1", "A-1-2"] },
        "other-user",
      ),
    );
    const availableSeat = await POST(
      makeRequest("POST", { sessionId, seatIds: ["A-1-2"] }, "third-user"),
    );

    expect(conflict.status).toBe(409);
    expect(availableSeat.status).toBe(201);
  });
});

describe("DELETE /api/holds", () => {
  it("releases seats owned by the requesting user", async () => {
    const sessionId = "route-delete-success";
    await POST(makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, "owner"));

    const response = await DELETE(
      makeRequest("DELETE", { sessionId, seatIds: ["A-1-1"] }, "owner"),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("returns 401 without a userId cookie", async () => {
    const response = await DELETE(
      makeRequest("DELETE", { sessionId: "route-delete-auth", seatIds: ["A-1-1"] }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when releasing another user's seat", async () => {
    const sessionId = "route-delete-owner";
    await POST(makeRequest("POST", { sessionId, seatIds: ["A-1-1"] }, "owner"));

    const response = await DELETE(
      makeRequest("DELETE", { sessionId, seatIds: ["A-1-1"] }, "other-user"),
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for a malformed body", async () => {
    const response = await DELETE(
      makeRequest(
        "DELETE",
        { sessionId: "route-delete-invalid", seatIds: ["Z-99-99"] },
        "test-user-1",
      ),
    );

    expect(response.status).toBe(400);
  });
});
