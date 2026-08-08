import { getUserIdFromRequest } from "@/lib/cookie";
import { getReservationStore } from "@/services";
import type { Reservation } from "@/types";

function sanitizeReservation(r: Reservation) {
  const { userId, ...rest } = r;
  return rest;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const reservation = await getReservationStore().cancel(id, userId);
    return Response.json({ reservation: sanitizeReservation(reservation) });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("FORBIDDEN")) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }
      if (error.message.startsWith("ALREADY_CANCELLED")) {
        return Response.json({ error: "already cancelled" }, { status: 409 });
      }
      if (error.message.startsWith("NOT_FOUND")) {
        return Response.json({ error: "not found" }, { status: 404 });
      }
    }
    throw error;
  }
}
