import { rupees } from "@/lib/money";

/**
 * Assumption A7: the brief gives no Tally import schema, so this is a plain, documented CSV
 * with one row per order line. Amounts are rupees with two decimals, rates are per case.
 */
export const TALLY_HEADER = [
  "Voucher Date",
  "Voucher No",
  "Party Name",
  "Item Code",
  "Item Name",
  "Qty (Cases)",
  "Free Qty (Cases)",
  "Rate Per Case",
  "Discount",
  "Amount",
] as const;

export type TallyOrder = {
  number: string;
  createdAt: Date;
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

/** Cells that start with = + - @ can run as formulas in spreadsheets, so they get a leading apostrophe. */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ddmmyyyy(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")}`;
}

export function buildTallyCsv(orders: TallyOrder[]): string {
  const rows: string[] = [TALLY_HEADER.map(csvCell).join(",")];
  for (const o of orders) {
    for (const l of o.lines) {
      rows.push(
        [
          ddmmyyyy(o.createdAt),
          o.number,
          o.retailerName,
          l.code,
          l.name,
          l.qtyCases,
          l.freeCases,
          rupees(l.piecePricePaise * l.piecesPerCase),
          rupees(l.discountPaise),
          rupees(l.lineTotalPaise),
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  return rows.join("\r\n") + "\r\n";
}
