import type { OrderStatus } from "@prisma/client";
import { orderLabel, STATUS_LABEL } from "@/lib/format";
import { rupees } from "@/lib/money";
import { csvCell } from "@/server/export/tally";
import { IST_OFFSET_MS } from "@/server/reports/period";

export type ReportOrder = {
  seq: number;
  createdAt: Date;
  status: OrderStatus;
  source: "APP" | "AI";
  retailerId: string;
  retailerName: string;
  lines: {
    code: string;
    name: string;
    qtyCases: number;
    freeCases: number;
    piecesPerCase: number;
    piecePricePaise: number;
    discountPaise: number;
    lineTotalPaise: number;
  }[];
};

export type ReportRow = {
  orderNo: string;
  createdAt: Date;
  status: string;
  shopId: string;
  shop: string;
  source: string;
  code: string;
  item: string;
  cases: number;
  freeCases: number;
  rateCasePaise: number;
  discountPaise: number;
  amountPaise: number;
};

/** One row per order line, grouped by shop, then oldest order first. */
export function toRows(orders: ReportOrder[]): ReportRow[] {
  const sorted = [...orders].sort(
    (a, b) => a.retailerName.localeCompare(b.retailerName) || a.createdAt.getTime() - b.createdAt.getTime() || a.seq - b.seq,
  );
  return sorted.flatMap((o) =>
    o.lines.map((l) => ({
      orderNo: orderLabel(o.seq),
      createdAt: o.createdAt,
      status: STATUS_LABEL[o.status],
      shopId: o.retailerId,
      shop: o.retailerName,
      source: o.source === "AI" ? "From message" : "App",
      code: l.code,
      item: l.name,
      cases: l.qtyCases,
      freeCases: l.freeCases,
      rateCasePaise: l.piecePricePaise * l.piecesPerCase,
      discountPaise: l.discountPaise,
      amountPaise: l.lineTotalPaise,
    })),
  );
}

export type ShopSummary = {
  id: string;
  name: string;
  orders: number;
  lines: number;
  cases: number;
  freeCases: number;
  totalPaise: number;
};

export type ReportSummary = {
  orders: number;
  lines: number;
  cases: number;
  freeCases: number;
  totalPaise: number;
  shops: ShopSummary[];
};

export function summarize(rows: ReportRow[]): ReportSummary {
  const byShop = new Map<string, ShopSummary & { orderNos: Set<string> }>();
  const allOrders = new Set<string>();
  for (const r of rows) {
    allOrders.add(r.orderNo);
    let s = byShop.get(r.shopId);
    if (!s) {
      s = { id: r.shopId, name: r.shop, orders: 0, lines: 0, cases: 0, freeCases: 0, totalPaise: 0, orderNos: new Set() };
      byShop.set(r.shopId, s);
    }
    s.orderNos.add(r.orderNo);
    s.lines += 1;
    s.cases += r.cases;
    s.freeCases += r.freeCases;
    s.totalPaise += r.amountPaise;
  }
  const shops = [...byShop.values()]
    .map(({ orderNos, ...s }) => ({ ...s, orders: orderNos.size }))
    .sort((a, b) => b.totalPaise - a.totalPaise || a.name.localeCompare(b.name));
  return {
    orders: allOrders.size,
    lines: rows.length,
    cases: shops.reduce((t, s) => t + s.cases, 0),
    freeCases: shops.reduce((t, s) => t + s.freeCases, 0),
    totalPaise: shops.reduce((t, s) => t + s.totalPaise, 0),
    shops,
  };
}

function istParts(d: Date): { date: string; time: string } {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${p(ist.getUTCDate())}-${p(ist.getUTCMonth() + 1)}-${ist.getUTCFullYear()}`,
    time: `${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}`,
  };
}

export const REPORT_HEADER = [
  "Order No",
  "Date",
  "Time",
  "Status",
  "Shop",
  "Source",
  "Item Code",
  "Item Name",
  "Cases",
  "Free Cases",
  "Rate per Case (INR)",
  "Discount (INR)",
  "Amount (INR, excl. GST)",
] as const;

/** UTF-8 with a byte-order mark, so Excel shows Hindi and other scripts correctly. */
export function buildReportCsv(rows: ReportRow[]): string {
  const lines: string[] = [REPORT_HEADER.map(csvCell).join(",")];
  for (const r of rows) {
    const { date, time } = istParts(r.createdAt);
    lines.push(
      [
        r.orderNo,
        date,
        time,
        r.status,
        r.shop,
        r.source,
        r.code,
        r.item,
        r.cases,
        r.freeCases,
        rupees(r.rateCasePaise),
        rupees(r.discountPaise),
        rupees(r.amountPaise),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function reportFileName(opts: {
  shopNames: string[];
  allShops: boolean;
  periodSlug: string;
  now: Date;
  ext: "csv" | "xlsx";
}): string {
  const scope = opts.allShops
    ? "all-shops"
    : opts.shopNames.length === 1
      ? slug(opts.shopNames[0]) || "shop"
      : `${opts.shopNames.length}-shops`;
  const ist = new Date(opts.now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  return `orders_${scope}_${opts.periodSlug}_${ist}.${opts.ext}`;
}
