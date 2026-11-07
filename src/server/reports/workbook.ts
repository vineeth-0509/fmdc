import { buildXlsx, type Cell, type Sheet } from "@/server/export/xlsx";
import { REPORT_HEADER, type ReportRow, type ReportSummary } from "@/server/reports/build";
import { IST_OFFSET_MS } from "@/server/reports/period";

const MAX_SHOP_TABS = 15;

const money = (paise: number): Cell => ({ v: paise / 100, s: "money" });

function istTime(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return `${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}`;
}

function lineRow(r: ReportRow, withShop: boolean): Cell[] {
  return [
    r.orderNo,
    { v: r.createdAt, s: "date" },
    istTime(r.createdAt),
    r.status,
    ...(withShop ? [r.shop] : []),
    r.source,
    r.code,
    r.item,
    { v: r.cases, s: "int" },
    { v: r.freeCases, s: "int" },
    money(r.rateCasePaise),
    money(r.discountPaise),
    money(r.amountPaise),
  ];
}

function header(withShop: boolean): Cell[] {
  const cols: string[] = [...REPORT_HEADER];
  const labels = withShop ? cols : cols.filter((c) => c !== "Shop");
  return labels.map((v) => ({ v, s: "header" as const }));
}

const WIDTHS_WITH_SHOP = [12, 13, 8, 18, 26, 14, 14, 36, 8, 11, 18, 15, 22];

export function buildReportWorkbook(
  rows: ReportRow[],
  summary: ReportSummary,
  meta: { rangeLabel: string; statusLabels: string[]; generatedAt: Date; shopCount: number },
): Buffer {
  const sheets: Sheet[] = [];

  sheets.push({
    name: "Summary",
    widths: [34, 10, 10, 10, 12, 18],
    rows: [
      [{ v: "Order report", s: "title" }],
      [{ v: `Period: ${meta.rangeLabel}`, s: "note" }],
      [{ v: `Statuses: ${meta.statusLabels.join(", ")}`, s: "note" }],
      [{ v: `Shops selected: ${meta.shopCount}`, s: "note" }],
      [{ v: "Amounts are in rupees and exclude GST.", s: "note" }],
      [{ v: `Generated: ${meta.generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`, s: "note" }],
      [],
      ["Shop", "Orders", "Lines", "Cases", "Free cases", "Amount (INR)"].map((v) => ({ v, s: "header" as const })),
      ...summary.shops.map((s): Cell[] => [
        s.name,
        { v: s.orders, s: "int" },
        { v: s.lines, s: "int" },
        { v: s.cases, s: "int" },
        { v: s.freeCases, s: "int" },
        money(s.totalPaise),
      ]),
      [
        { v: "Total", s: "bold" },
        { v: summary.orders, s: "int" },
        { v: summary.lines, s: "int" },
        { v: summary.cases, s: "int" },
        { v: summary.freeCases, s: "int" },
        { v: summary.totalPaise / 100, s: "moneyBold" },
      ],
    ],
  });

  sheets.push({
    name: "All orders",
    freezeRows: 1,
    widths: WIDTHS_WITH_SHOP,
    rows: [header(true), ...rows.map((r) => lineRow(r, true))],
  });

  // One tab per shop when the number of shops is reasonable; the All orders tab always has everything.
  if (summary.shops.length > 1 && summary.shops.length <= MAX_SHOP_TABS) {
    for (const shop of summary.shops) {
      const shopRows = rows.filter((r) => r.shopId === shop.id);
      sheets.push({
        name: shop.name,
        freezeRows: 1,
        widths: WIDTHS_WITH_SHOP.filter((_, i) => i !== 4),
        rows: [
          header(false),
          ...shopRows.map((r) => lineRow(r, false)),
          [
            { v: "Total", s: "bold" },
            ...Array.from({ length: 6 }, () => null),
            { v: shop.cases, s: "int" },
            { v: shop.freeCases, s: "int" },
            null,
            null,
            { v: shop.totalPaise / 100, s: "moneyBold" },
          ],
        ],
      });
    }
  }

  return buildXlsx(sheets);
}
