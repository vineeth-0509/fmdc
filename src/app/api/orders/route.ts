import { ok, readJson, requireApi, route } from "@/lib/api";
import { placeSchema } from "@/lib/validation";
import { placeOrder } from "@/server/orders";

export async function POST(req: Request) {
  return route(req, async () => {
    const session = await requireApi("RETAILER");
    const body = placeSchema.parse(await readJson(req));
    const result = await placeOrder({
      retailerId: session.retailerId as string,
      userId: session.uid,
      lines: body.lines.map((l) => ({ skuId: l.skuId, qtyCases: l.qtyCases, originalText: l.originalText })),
      captureId: body.captureId,
      note: body.note,
    });
    return ok(result, { status: 201 });
  });
}
