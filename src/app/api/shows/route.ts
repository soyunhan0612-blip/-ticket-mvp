import { getUserIdFromRequest } from "@/lib/cookie";
import {
  getPosterUrl,
  isValidPosterPresetId,
} from "@/lib/poster-preset";
import { isValidPresetId } from "@/lib/seat-preset";
import { createShowInputSchema } from "@/lib/show-validation";
import { getShowStore } from "@/services";

export async function GET(): Promise<Response> {
  const shows = await getShowStore().list();

  return Response.json({ shows });
}

export async function POST(request: Request): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = createShowInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid body", message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (!isValidPresetId(input.presetId)) {
    return Response.json({ error: "invalid preset" }, { status: 400 });
  }

  if (!isValidPosterPresetId(input.posterUrl)) {
    return Response.json({ error: "invalid poster preset" }, { status: 400 });
  }

  const posterUrl = getPosterUrl(input.posterUrl);
  if (!posterUrl) {
    return Response.json({ error: "invalid poster preset" }, { status: 400 });
  }

  const { show, sessions } = await getShowStore().create({
    ...input,
    posterUrl,
  });

  return Response.json({ show, sessions }, { status: 201 });
}
