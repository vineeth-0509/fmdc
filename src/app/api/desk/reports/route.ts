import { z } from "zod";
import { OrderStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, ok, requireApi, route } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";
import type { ReportPreview } from "@/lib/report-types";
import { buildReportCsv, reportFileName, summarize, toRows, type ReportOrder } from "@/server/reports/build";
import { PERIOD_KEYS, periodRange } from "@/server/reports/period";
import { buildReportWorkbook } from "@/server/reports/workbook";

const MAX_LINES = 20_000;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const query = z.object({
  shops: z.string().min(1).max(12_000),
  period: z.enum(PERIOD_KEYS),
  from: z.string().regex(DAY).optional(),
  to: z.string().regex(DAY).optional(),
  statuses: z.string().min(1).max(120),
  format: z.enum(["preview", "csv", "xlsx"]),
});

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Read-only. Never changes an order, so a report can be downloaded as often as needed. */
export async function GET(req: Request) {
  return route(req, async () => {
    await requireApi("DESK");
    const url = new URL(req.url);
    const q = query.parse(Object.fromEntries(url.searchParams));

    const statuses = [...new Set(q.statuses.split(",").map((s) => s.trim()))].filter((s): s is OrderStatus =>
      (Object.values(OrderStatus) as string[]).includes(s),
    );
    if (statuses.length === 0) throw new AppError(400, "INVALID_INPUT", "Choose at least one order status.");

    let range;
    try {
      range = periodRange(q.period, new Date(), { from: q.from, to: q.to });
    } catch (e) {
      throw new AppError(400, "INVALID_INPUT", e instanceof Error ? e.message : "Invalid period.");
    }

    const allShops = q.shops === "all";
    let shopIds: string[] = [];
    let shopNames: string[] = [];
    if (!allShops) {
      shopIds = [...new Set(q.shops.split(",").map((s) => s.trim()))];
      if (shopIds.length === 0 || shopIds.length > 300 || shopIds.some((id) => !ID.test(id))) {
        throw new AppError(400, "INVALID_INPUT", "Choose between 1 and 300 shops.");
      }
      const found = await prisma.retailer.findMany({ where: { id: { in: shopIds } }, select: { id: true, name: true } });
      if (found.length !== shopIds.length) throw new AppError(400, "INVALID_INPUT", "Some selected shops were not found.");
      shopNames = found.map((s) => s.name);
    }

    const where: Prisma.OrderWhereInput = {
      createdAt: { gte: range.from, lte: range.to },
      status: { in: statuses },
      ...(allShops ? {} : { retailerId: { in: shopIds } }),
    };

    const lineCount = await prisma.orderLine.count({ where: { order: where } });
    if (lineCount > MAX_LINES) {
      throw new AppError(413, "TOO_MANY_ROWS", `That is ${lineCount.toLocaleString("en-IN")} lines. Pick fewer shops or a shorter period (limit ${MAX_LINES.toLocaleString("en-IN")}).`);
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        retailer: { select: { id: true, name: true } },
        lines: {
          orderBy: { id: "asc" },
          include: { sku: { select: { code: true, name: true, piecesPerCase: true } } },
        },
      },
    });

    const reportOrders: ReportOrder[] = orders.map((o) => ({
      seq: o.seq,
      createdAt: o.createdAt,
      status: o.status,
      source: o.source,
      retailerId: o.retailer.id,
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
    const rows = toRows(reportOrders);
    const summary = summarize(rows);

    if (q.format === "preview") {
      const preview: ReportPreview = {
        orders: summary.orders,
        lines: summary.lines,
        cases: summary.cases,
        freeCases: summary.freeCases,
        totalPaise: summary.totalPaise,
        rangeLabel: range.label,
        shops: summary.shops.map((s) => ({ id: s.id, name: s.name, orders: s.orders, lines: s.lines, totalPaise: s.totalPaise })),
      };
      return ok(preview, { headers: { "Cache-Control": "no-store" } });
    }

    if (rows.length === 0) {
      throw new AppError(404, "NOTHING_TO_EXPORT", "No orders match these choices, so there is nothing to download.");
    }

    const now = new Date();
    const fileName = reportFileName({
      shopNames: allShops ? [] : shopNames,
      allShops,
      periodSlug: range.slug,
      now,
      ext: q.format,
    });
    const headers = {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
      "X-Report-Rows": String(rows.length),
    };

    if (q.format === "csv") {
      return new Response(buildReportCsv(rows), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
    }
    const file = buildReportWorkbook(rows, summary, {
      rangeLabel: range.label,
      statusLabels: statuses.map((s) => STATUS_LABEL[s]),
      generatedAt: now,
      shopCount: summary.shops.length,
    });
    return new Response(new Uint8Array(file), { headers: { ...headers, "Content-Type": XLSX_TYPE } });
  });
}
