import { z } from "zod";

import { getUserIdFromRequest } from "@/lib/cookie";
import { parseSeatId, SECTIONS, TOTAL_SEATS } from "@/lib/seat-map";
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

  // Seat ids validate against the global A-D map, so a session can carry seats
  // outside its own preset. Counting those against a preset-sized total is what
  // drove `available` negative, so aggregate only the preset's own sections.
  const { presetId } = showSession.show;
  const preset = presetId ? getPreset(presetId) : undefined;
  const total = preset ? preset.totalSeats : TOTAL_SEATS;
  const sections: ReadonlySet<string> = new Set(
    preset ? preset.sections : SECTIONS,
  );

  let held = 0;
  let sold = 0;

  for (const [seatId, seat] of Object.entries(snapshot.seats)) {
    const parsed = parseSeatId(seatId);
    if (!parsed || !sections.has(parsed.section)) continue;

    if (seat.s === "held") held += 1;
    else if (seat.s === "sold") sold += 1;
  }

  return Response.json({
    total,
    available: total - held - sold,
    held,
    sold,
    version: snapshot.version,
    serverNow: snapshot.serverNow,
  });
}
