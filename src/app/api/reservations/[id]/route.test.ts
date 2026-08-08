import { describe, expect, it } from "vitest";

import { POST as holdPost } from "@/app/api/holds/route";
import { POST as reservationPost } from "@/app/api/reservations/route";

import { DELETE } from "./route";

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

function makeReservationRequest(sessionId: string, seatIds: string[], userId: string) {
  return new Request("http://localhost/api/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `userId=${userId}`,
    },
    body: JSON.stringify({ sessionId, seatIds }),
  });
}

function makeDeleteRequest(id: string, userId?: string) {
  return new Request(`http://localhost/api/reservations/${id}`, {
    method: "DELETE",
    headers: {
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
    },
  });
}

async function createReservation(sessionId: string, seatIds: string[], userId: string) {
  await holdPost(makeHoldRequest(sessionId, seatIds, userId));
  const res = await reservationPost(makeReservationRequest(sessionId, seatIds, userId));
  const body = await res.json() as { reservation: { id: string } };
  return body.reservation.id;
}

describe("DELETE /api/reservations/[id]", () => {
  it("cancels a reservation (200)", async () => {
    const id = await createReservation("del-api-ok", ["A-1-1"], "del-user-1");

    const response = await DELETE(makeDeleteRequest(id, "del-user-1"), {
      params: Promise.resolve({ id }),
    });
    const body = await response.json() as { reservation: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.reservation).toMatchObject({ status: "cancelled" });
  });

  it("does not include userId in response", async () => {
    const id = await createReservation("del-api-nuid", ["A-1-1"], "del-user-2");

    const response = await DELETE(makeDeleteRequest(id, "del-user-2"), {
      params: Promise.resolve({ id }),
    });
    const body = await response.json() as { reservation: Record<string, unknown> };

    expect(body.reservation).not.toHaveProperty("userId");
  });

  it("returns 401 without a userId cookie", async () => {
    const response = await DELETE(makeDeleteRequest("any-id"), {
      params: Promise.resolve({ id: "any-id" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 403 for another user's reservation", async () => {
    const id = await createReservation("del-api-forbidden", ["A-1-1"], "del-owner");

    const response = await DELETE(makeDeleteRequest(id, "del-other"), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 409 for already cancelled reservation", async () => {
    const id = await createReservation("del-api-cancelled", ["A-1-1"], "del-user-3");
    await DELETE(makeDeleteRequest(id, "del-user-3"), {
      params: Promise.resolve({ id }),
    });

    const response = await DELETE(makeDeleteRequest(id, "del-user-3"), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(409);
  });

  it("returns 404 for non-existent reservation", async () => {
    const response = await DELETE(makeDeleteRequest("nonexistent", "del-user-4"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });
});
