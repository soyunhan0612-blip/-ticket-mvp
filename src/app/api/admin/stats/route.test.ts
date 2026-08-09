import { describe, expect, it } from "vitest";

import { TOTAL_SEATS } from "@/lib/seat-map";
import { getSeatStore, getShowStore } from "@/services";

import { GET } from "./route";

interface StatsResponse {
  total: number;
  available: number;
  held: number;
  sold: number;
  version: number;
  serverNow: number;
}

function makeRequest(sessionId?: string, userId?: string): Request {
  const url = new URL("http://localhost/api/admin/stats");
  if (sessionId !== undefined) url.searchParams.set("sessionId", sessionId);

  return new Request(url, {
    headers: userId ? { Cookie: `userId=${userId}` } : {},
  });
}

async function createSession(presetId: "small" | "medium" | "large" = "large") {
  const result = await getShowStore().create({
    title: `Admin stats ${crypto.randomUUID()}`,
    description: "Admin stats route test",
    posterUrl: "/posters/concert.svg",
    presetId,
    sessions: ["2026-12-01T10:00:00.000Z"],
  });

  return result.sessions[0].id;
}

async function getStats(sessionId: string, userId = "admin-stats-user") {
  const response = await GET(makeRequest(sessionId, userId));
  const body = (await response.json()) as StatsResponse;
  return { response, body };
}

describe("GET /api/admin/stats", () => {
  it("returns all four aggregates for a valid session", async () => {
    const sessionId = await createSession("small");
    const { response, body } = await getStats(sessionId);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      total: 500,
      available: 500,
      held: 0,
      sold: 0,
      version: expect.any(Number),
      serverNow: expect.any(Number),
    });
  });

  it("counts held seats and subtracts them from available seats", async () => {
    const sessionId = await createSession();
    await getSeatStore().hold(sessionId, ["A-1-1", "A-1-2"], "hold-owner");

    const { body } = await getStats(sessionId, "hold-owner");

    expect(body.held).toBe(2);
    expect(body.available).toBe(body.total - 2);
  });

  it("counts confirmed seats as sold", async () => {
    const sessionId = await createSession();
    const seatIds = ["A-1-3", "A-1-4"];
    await getSeatStore().hold(sessionId, seatIds, "confirm-owner");
    await getSeatStore().confirmSeats(sessionId, seatIds, "confirm-owner");

    const { body } = await getStats(sessionId, "confirm-owner");

    expect(body.held).toBe(0);
    expect(body.sold).toBe(2);
  });

  it("excludes seats outside the show's preset sections", async () => {
    const sessionId = await createSession("small");
    await getSeatStore().hold(sessionId, ["A-5-1"], "in-preset-owner");
    await getSeatStore().hold(sessionId, ["B-1-1", "C-1-1"], "out-of-preset-owner");
    await getSeatStore().hold(sessionId, ["D-1-1"], "out-of-preset-sold-owner");
    await getSeatStore().confirmSeats(
      sessionId,
      ["D-1-1"],
      "out-of-preset-sold-owner",
    );

    const { body } = await getStats(sessionId);

    expect(body.total).toBe(500);
    expect(body.held).toBe(1);
    expect(body.sold).toBe(0);
    expect(body.available).toBe(499);
  });

  it("never reports negative availability when out-of-preset seats are held", async () => {
    const sessionId = await createSession("small");
    const outOfPresetSeatIds = Array.from(
      { length: 16 },
      (_, index) => `B-${index + 1}-1`,
    );
    await getSeatStore().hold(sessionId, outOfPresetSeatIds, "flood-owner");

    const { body } = await getStats(sessionId);

    expect(body.held).toBe(0);
    expect(body.available).toBe(500);
    expect(body.available).toBeGreaterThanOrEqual(0);
  });

  it("counts every section for a show without a presetId", async () => {
    await getSeatStore().hold("session-01", ["D-25-20"], "fallback-owner");

    const { body } = await getStats("session-01");

    expect(body.total).toBe(TOTAL_SEATS);
    expect(body.held).toBe(1);
  });

  it("returns 404 for an unknown session", async () => {
    const response = await GET(makeRequest("missing-admin-session", "admin-user"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "session not found" });
  });

  it("returns 400 when sessionId is missing", async () => {
    const response = await GET(makeRequest(undefined, "admin-user"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid session id" });
  });

  it("returns 401 without a userId cookie", async () => {
    const sessionId = await createSession();
    const response = await GET(makeRequest(sessionId));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
  });

  it("does not expose userId in the serialized response", async () => {
    const sessionId = await createSession();
    const userId = `secret-owner-${crypto.randomUUID()}`;
    await getSeatStore().hold(sessionId, ["A-3-1"], userId);

    const response = await GET(makeRequest(sessionId, userId));
    const serialized = await response.text();

    expect(response.status).toBe(200);
    expect(serialized).not.toContain(userId);
    expect(serialized).not.toContain("userId");
  });
});
