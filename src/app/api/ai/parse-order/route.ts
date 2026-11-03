import { prisma } from "@/lib/db";
import { AppError, ok, readJson, requireApi, route } from "@/lib/api";
import { captureSchema } from "@/lib/validation";
import { captureOrder } from "@/server/capture/service";

export async function POST(req: Request) {
  return route(req, async () => {
    const session = await requireApi("RETAILER");
    const { text } = captureSchema.parse(await readJson(req));
    const retailerId = session.retailerId as string;

    // Light rate limit so the AI call cannot be spammed.
    const recent = await prisma.capture.count({
      where: { retailerId, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (recent >= 10) throw new AppError(429, "RATE_LIMITED", "Please wait a minute before reading more messages.");

    return ok(await captureOrder(retailerId, text));
  });
}
