import { z } from "zod";

import { getUserIdFromRequest } from "@/lib/cookie";
import { TOTAL_SEATS } from "@/lib/seat-map";
import { getPreset } from "@/lib/seat-preset";
import { getSeatStore, getShowStore } from "@/services";

const sessionIdSchema = z.string().min(1).regex(/^[A-Za-z0-9_-]+$/);

export async function GET(request: Request): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsedSessionId = sessionIdSchema.safeParse(
    new URL(request.url).searchParams.get("sessionId"),
  );
  if (!parsedSessionId.success) {
    return Response.json({ error: "invalid session id" }, { status: 400 });
  }

  const sessionId = parsedSessionId.data;
  const showSession = await getShowStore().getBySessionId(sessionId);
  if (!showSession) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const snapshot = await getSeatStore().getSnapshot(sessionId, userId);
  let held = 0;
  let sold = 0;

  for (const seat of Object.values(snapshot.seats)) {
    if (seat.s === "held") held += 1;
    if (seat.s === "sold") sold += 1;
  }

  const total = showSession.show.presetId
    ? getPreset(showSession.show.presetId).totalSeats
    : TOTAL_SEATS;

  return Response.json({
    total,
    available: total - held - sold,
    held,
    sold,
    version: snapshot.version,
    serverNow: snapshot.serverNow,
  });
}
