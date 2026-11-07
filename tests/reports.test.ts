import { describe, it, expect } from "vitest";
import { periodRange, subMonths } from "@/server/reports/period";
import { buildReportCsv, reportFileName, slug, summarize, toRows, type ReportOrder } from "@/server/reports/build";

const NOW = new Date("2026-11-04T10:00:00Z");

describe("periodRange", () => {
  it("counts days back from now", () => {
    const r = periodRange("7d", NOW);
    expect(r.to.getTime()).toBe(NOW.getTime());
    expect(NOW.getTime() - r.from.getTime()).toBe(7 * 86_400_000);
    expect(r.label).toBe("Last 7 days");
    expect(r.slug).toBe("last-7-days");
  });
  it("supports 1 and 2 days", () => {
    expect(NOW.getTime() - periodRange("1d", NOW).from.getTime()).toBe(86_400_000);
    expect(NOW.getTime() - periodRange("2d", NOW).from.getTime()).toBe(2 * 86_400_000);
  });
  it("goes back whole calendar months", () => {
    expect(periodRange("1m", NOW).from.toISOString()).toBe("2026-10-04T10:00:00.000Z");
    expect(periodRange("3m", NOW).from.toISOString()).toBe("2026-08-04T10:00:00.000Z");
    expect(periodRange("6m", NOW).from.toISOString()).toBe("2026-05-04T10:00:00.000Z");
  });
  it("keeps the last day of a shorter month", () => {
    expect(subMonths(new Date("2026-03-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(subMonths(new Date("2028-03-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2028-02-29");
  });
  it("uses IST day boundaries for custom dates", () => {
    const r = periodRange("custom", NOW, { from: "2026-11-01", to: "2026-11-03" });
    expect(r.from.toISOString()).toBe("2026-10-31T18:30:00.000Z"); // 00:00 IST on 1 Nov
    expect(r.to.toISOString()).toBe("2026-11-03T18:29:59.999Z"); // 23:59:59.999 IST on 3 Nov
    expect(r.label).toBe("01-11-2026 to 03-11-2026");
  });
  it("rejects bad custom dates", () => {
    expect(() => periodRange("custom", NOW, { from: "2026-11-05", to: "2026-11-01" })).toThrow(RangeError);
    expect(() => periodRange("custom", NOW, { from: "2026-02-30", to: "2026-03-01" })).toThrow(RangeError);
    expect(() => periodRange("custom", NOW, { from: "2020-01-01", to: "2026-11-01" })).toThrow(RangeError);
    expect(() => periodRange("custom", NOW, {})).toThrow(RangeError);
  });
});

const line = (code: string, name: string, qty: number, free: number, price: number, ppc: number, disc: number, total: number) => ({
  code,
  name,
  qtyCases: qty,
  freeCases: free,
  piecesPerCase: ppc,
  piecePricePaise: price,
  discountPaise: disc,
  lineTotalPaise: total,
});

const ORDERS: ReportOrder[] = [
  {
    seq: 2,
    createdAt: new Date("2026-11-03T08:00:00Z"),
    status: "CONFIRMED",
    source: "APP",
    retailerId: "r2",
    retailerName: "Sharma General Store",
    lines: [line("SKU-DT-1KG", "Detergent powder 1 kg, case of 20", 5, 0, 10150, 20, 30_450, 984_550)],
  },
  {
    seq: 1,
    createdAt: new Date("2026-11-02T08:00:00Z"),
    status: "EXPORTED",
    source: "AI",
    retailerId: "r1",
    retailerName: "Gupta, Kirana & \"Co\"",
    lines: [
      line("SKU-BS-075", "Glucose biscuit 75 g, case of 96", 10, 1, 810, 96, 0, 777_600),
      line("SKU-SP-100", "Soap bar 100 g, case of 72", 2, 0, 2400, 72, 0, 345_600),
    ],
  },
];

describe("report rows and summary", () => {
  const rows = toRows(ORDERS);
  it("makes one row per line, grouped by shop name", () => {
    expect(rows).toHaveLength(3);
    expect(rows[0].shop).toBe('Gupta, Kirana & "Co"');
    expect(rows[2].shop).toBe("Sharma General Store");
    expect(rows[0].orderNo).toBe("ORD-1001");
    expect(rows[0].source).toBe("From message");
    expect(rows[0].rateCasePaise).toBe(810 * 96);
  });
  it("totals orders, lines, cases and amount", () => {
    const s = summarize(rows);
    expect(s.orders).toBe(2);
    expect(s.lines).toBe(3);
    expect(s.cases).toBe(17);
    expect(s.freeCases).toBe(1);
    expect(s.totalPaise).toBe(777_600 + 345_600 + 984_550);
    expect(s.shops[0].name).toBe('Gupta, Kirana & "Co"'); // largest amount first
    expect(s.shops.find((x) => x.id === "r1")?.orders).toBe(1);
  });
});

describe("buildReportCsv", () => {
  const csv = buildReportCsv(toRows(ORDERS));
  const lines = csv.split("\r\n").filter(Boolean);
  it("starts with a byte-order mark and the header", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0].slice(1).startsWith("Order No,Date,Time,Status,Shop")).toBe(true);
  });
  it("quotes names that contain commas and quotes", () => {
    expect(lines[1]).toContain('"Gupta, Kirana & ""Co"""');
  });
  it("writes IST date and time and rupee amounts", () => {
    expect(lines[1].startsWith("ORD-1001,02-11-2026,13:30,Exported to Tally,")).toBe(true);
    expect(lines[1].endsWith("777.60,0.00,7776.00")).toBe(true);
  });
});

describe("file names", () => {
  it("names the file after the shop count and period", () => {
    const base = { periodSlug: "last-7-days", now: NOW, ext: "xlsx" as const };
    expect(reportFileName({ ...base, shopNames: ["Sharma General Store"], allShops: false })).toBe("orders_sharma-general-store_last-7-days_2026-11-04.xlsx");
    expect(reportFileName({ ...base, shopNames: ["A", "B", "C"], allShops: false })).toBe("orders_3-shops_last-7-days_2026-11-04.xlsx");
    expect(reportFileName({ ...base, shopNames: [], allShops: true })).toBe("orders_all-shops_last-7-days_2026-11-04.xlsx");
  });
  it("falls back for names with no latin letters", () => {
    expect(slug("दुकान")).toBe("");
    expect(reportFileName({ shopNames: ["दुकान"], allShops: false, periodSlug: "x", now: NOW, ext: "csv" })).toBe("orders_shop_x_2026-11-04.csv");
  });
});
