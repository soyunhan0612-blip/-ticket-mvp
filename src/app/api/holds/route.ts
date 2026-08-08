import { z } from "zod";

import { getUserIdFromRequest } from "@/lib/cookie";
import { isValidSeatId } from "@/lib/seat-map";
import { validateSelection } from "@/lib/seat-rules";
import { getSeatStore } from "@/services";

const requestBodySchema = z.object({
  sessionId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1),
});

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

  const result = await getSeatStore().hold(sessionId, seatIds, userId);
  if ("conflict" in result) {
    return Response.json(
      { error: "conflict", conflict: result.conflict },
      { status: 409 },
    );
  }

  const { id, expiresAt } = result;
  return Response.json(
    { hold: { id, sessionId, seatIds: result.seatIds, expiresAt } },
    { status: 201 },
  );
}

export async function DELETE(request: Request): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = await parseRequestBody(request);
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { sessionId, seatIds } = parsed.data;
  if (seatIds.some((seatId) => !isValidSeatId(seatId))) {
    return Response.json({ error: "invalid seat id" }, { status: 400 });
  }

  try {
    await getSeatStore().release(sessionId, seatIds, userId);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("FORBIDDEN")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  return new Response(null, { status: 204 });
}
