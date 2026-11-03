import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, requireApi, route } from "@/lib/api";
import { orderLabel } from "@/lib/format";
import { buildTallyCsv, type TallyOrder } from "@/server/export/tally";

const include = {
  retailer: { select: { name: true } },
  lines: { include: { sku: { select: { code: true, name: true, piecesPerCase: true } } } },
} as const;

type Row = Awaited<ReturnType<typeof load>>[number];

function load(status: OrderStatus) {
  return prisma.order.findMany({ where: { status }, include, orderBy: { seq: "asc" } });
}

function toTally(rows: Row[]): TallyOrder[] {
  return rows.map((o) => ({
    number: orderLabel(o.seq),
    createdAt: o.createdAt,
    retailerName: o.retailer.name,
    lines: o.lines.map((l) => ({
      code: l.sku.code,
      name: l.sku.name,
      qtyCases: l.qtyCases,
      freeCases: l.freeCases,
      piecesPerCase: l.sku.piecesPerCase,
      piecePricePaise: l.piecePricePaise,
      discountPaise: l.discountPaise,
      lineTotalPaise: l.lineTotalPaise,
    })),
  }));
}

function csvResponse(csv: string, prefix: string) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${prefix}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Read-only download of already confirmed or exported orders. Nothing changes. */
export async function GET(req: Request) {
  return route(req, async () => {
    await requireApi("DESK");
    const status = new URL(req.url).searchParams.get("status") === "EXPORTED" ? "EXPORTED" : "CONFIRMED";
    const rows = await load(status);
    if (rows.length === 0) throw new AppError(404, "NOTHING_TO_EXPORT", "There are no orders to download.");
    return csvResponse(buildTallyCsv(toTally(rows)), `tally-${status.toLowerCase()}`);
  });
}

/** Exports every confirmed order once and marks it exported, so it cannot be sent to Tally twice. */
export async function POST(req: Request) {
  return route(req, async () => {
    const session = await requireApi("DESK");
    const csv = await prisma.$transaction(async (tx) => {
      const rows = await tx.order.findMany({ where: { status: "CONFIRMED" }, include, orderBy: { seq: "asc" } });
      if (rows.length === 0) throw new AppError(409, "NOTHING_TO_EXPORT", "There are no confirmed orders to export.");
      const ids = rows.map((r) => r.id);
      await tx.order.updateMany({ where: { id: { in: ids }, status: "CONFIRMED" }, data: { status: "EXPORTED" } });
      await tx.orderEvent.createMany({
        data: ids.map((orderId) => ({ orderId, actorId: session.uid, action: "EXPORTED", note: "Included in a Tally CSV." })),
      });
      return buildTallyCsv(toTally(rows as Row[]));
    });
    return csvResponse(csv, "tally-export");
  });
}
