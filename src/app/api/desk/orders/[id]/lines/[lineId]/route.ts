import { ok, readJson, requireApi, route } from "@/lib/api";
import { lineEditSchema } from "@/lib/validation";
import { editOrderLine } from "@/server/orders";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; lineId: string }> }) {
  return route(req, async () => {
    const session = await requireApi("DESK");
    const { id, lineId } = await ctx.params;
    const patch = lineEditSchema.parse(await readJson(req));
    return ok(await editOrderLine(id, lineId, session.uid, patch));
  });
}
