import { getUserIdFromRequest } from "@/lib/cookie";
import { getSeatStore } from "@/services";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await context.params;
  const snapshot = await getSeatStore().getSnapshot(sessionId, userId);

  return Response.json(snapshot);
}
