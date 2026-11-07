import { prisma } from "@/lib/db";
import { AppError, ok, readJson, requireApi, route } from "@/lib/api";
import { captureBodySchema } from "@/lib/validation";
import { captureOrder, captureOrderFromImage } from "@/server/capture/service";

export async function POST(req: Request) {
  return route(req, async () => {
    const session = await requireApi("RETAILER");
    const body = captureBodySchema.parse(await readJson(req));
    const retailerId = session.retailerId as string;

    // Light rate limit so the AI call cannot be spammed.
    const recent = await prisma.capture.count({
      where: { retailerId, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (recent >= 10) throw new AppError(429, "RATE_LIMITED", "Please wait a minute before reading more.");

    if ("image" in body) return ok(await captureOrderFromImage(retailerId, body.image));
    return ok(await captureOrder(retailerId, body.text));
  });
}
