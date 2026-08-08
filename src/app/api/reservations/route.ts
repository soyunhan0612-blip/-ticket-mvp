import { z } from "zod";

import { getUserIdFromRequest } from "@/lib/cookie";
import { validateSelection } from "@/lib/seat-rules";
import { getReservationStore } from "@/services";
import type { Reservation } from "@/types";

const requestBodySchema = z.object({
  sessionId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1),
});

function sanitizeReservation(r: Reservation) {
  const { userId, ...rest } = r;
  return rest;
}

async function parseRequestBody(request: Request) {
  try {
    return requestBodySchema.safeParse(await request.json());
  } catch {
    return requestBodySchema.safeParse(undefined);
  }
}

export async function POST(request: Request): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = await parseRequestBody(request);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { sessionId, seatIds } = parsed.data;
  const validation = validateSelection(seatIds);
  if (!validation.ok) {
    return Response.json(
      { error: "invalid selection", reason: validation.reason },
      { status: 400 },
    );
  }

  try {
    const reservation = await getReservationStore().create(sessionId, seatIds, userId);
    return Response.json(
      { reservation: sanitizeReservation(reservation) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("FORBIDDEN")) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }
      if (error.message.startsWith("EXPIRED")) {
        return Response.json({ error: "expired" }, { status: 410 });
      }
    }
    throw error;
  }
}

export async function GET(request: Request): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const reservations = await getReservationStore().listByUser(userId);
  return Response.json({
    reservations: reservations.map(sanitizeReservation),
  });
}
