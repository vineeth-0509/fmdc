import { ok, readJson, requireApi, route } from "@/lib/api";
import { orderActionSchema } from "@/lib/validation";
import { confirmOrder, rejectOrder } from "@/server/orders";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return route(req, async () => {
    const session = await requireApi("DESK");
    const { id } = await ctx.params;
    const body = orderActionSchema.parse(await readJson(req));
    if (body.action === "confirm") return ok(await confirmOrder(id, session.uid));
    await rejectOrder(id, session.uid, body.reason);
    return ok({ status: "REJECTED", message: "Order rejected and stock returned." });
  });
}
