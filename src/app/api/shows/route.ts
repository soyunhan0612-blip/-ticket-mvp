import { getShowStore } from "@/services";

export async function GET(): Promise<Response> {
  const shows = await getShowStore().list();

  return Response.json({ shows });
}
