import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { GET, POST } from "./route";

const validInput = {
  title: "새 공연",
  description: "새 공연 설명",
  posterUrl: "concert",
  presetId: "medium",
  sessions: [
    "2026-11-01T10:00:00.000Z",
    "2026-11-02T10:00:00.000Z",
  ],
};

function makePostRequest(body?: unknown, userId?: string): Request {
  return new Request("http://localhost/api/shows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("GET /api/shows", () => {
  it("returns all shows", async () => {
    const response = await GET();
    const body = (await response.json()) as { shows: unknown[] };

    expect(response.status).toBe(200);
    expect(body.shows).toHaveLength(8);
  });
});

describe("POST /api/shows", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
  });

  it("creates a show with resolved poster URL and matching sessions", async () => {
    const response = await POST(
      makePostRequest(validInput, "seller-api-success"),
    );
    const body = (await response.json()) as {
      show: Record<string, unknown>;
      sessions: unknown[];
    };

    expect(response.status).toBe(201);
    expect(body.show).toMatchObject({
      id: expect.any(String),
      title: validInput.title,
      description: validInput.description,
      posterUrl: "/posters/concert.svg",
      presetId: validInput.presetId,
    });
    expect(body.show).not.toHaveProperty("userId");
    expect(body.sessions).toHaveLength(validInput.sessions.length);
    expect(revalidatePathMock).toHaveBeenCalledWith("/shows");
  });

  it("returns 401 without a userId cookie", async () => {
    const response = await POST(makePostRequest(validInput));

    expect(response.status).toBe(401);
  });

  it("returns 400 without a body", async () => {
    const response = await POST(
      makePostRequest(undefined, "seller-api-missing-body"),
    );

    expect(response.status).toBe(400);
  });

  it.each([
    ["an empty title", { title: "" }],
    ["a title over 100 characters", { title: "가".repeat(101) }],
    ["an invalid preset ID", { presetId: "huge" }],
    ["an unknown poster preset", { posterUrl: "https://example.com/x.jpg" }],
    ["no sessions", { sessions: [] }],
  ])("returns 400 for %s", async (_label, override) => {
    const response = await POST(
      makePostRequest(
        { ...validInput, ...override },
        `seller-api-invalid-${String(_label)}`,
      ),
    );

    expect(response.status).toBe(400);
  });

  it("includes a newly created show in subsequent GET responses", async () => {
    const title = `GET 반영 공연 ${crypto.randomUUID()}`;
    const createResponse = await POST(
      makePostRequest({ ...validInput, title }, "seller-api-get"),
    );
    const listResponse = await GET();
    const body = (await listResponse.json()) as {
      shows: Array<{ title: string; posterUrl?: string }>;
    };

    expect(createResponse.status).toBe(201);
    expect(listResponse.status).toBe(200);
    expect(body.shows).toContainEqual(
      expect.objectContaining({
        title,
        posterUrl: "/posters/concert.svg",
      }),
    );
  });
});
