import { ok, readJson, requireApi, route } from "@/lib/api";
import { previewSchema } from "@/lib/validation";
import { previewCart } from "@/server/orders";

export async function POST(req: Request) {
  return route(req, async () => {
    const session = await requireApi("RETAILER");
    const { lines } = previewSchema.parse(await readJson(req));
    const preview = await previewCart(
      session.retailerId as string,
      lines.map((l) => ({ skuId: l.skuId, qtyCases: l.qtyCases, originalText: l.originalText })),
    );
    return ok(preview);
  });
}
