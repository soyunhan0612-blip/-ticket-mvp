import { getShowStore } from "@/services";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  void request;

  const { id } = await context.params;
  const result = await getShowStore().get(id);

  if (!result) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const { show, sessions } = result;

  return Response.json({ show, sessions });
}
