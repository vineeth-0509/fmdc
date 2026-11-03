import { describe, it, expect } from "vitest";
import { buildTallyCsv, csvCell, TALLY_HEADER, type TallyOrder } from "@/server/export/tally";

const order: TallyOrder = {
  number: "ORD-1002",
  createdAt: new Date("2026-11-02T06:30:00Z"),
  retailerName: "Sharma General Store",
  lines: [
    {
      code: "SKU-DT-1KG",
      name: "Detergent powder 1 kg, case of 20",
      qtyCases: 5,
      freeCases: 0,
      piecesPerCase: 20,
      piecePricePaise: 10150,
      discountPaise: 30_450,
      lineTotalPaise: 984_550,
    },
  ],
};

describe("buildTallyCsv", () => {
  const rows = buildTallyCsv([order]).trim().split("\r\n");

  it("starts with the documented header", () => {
    expect(rows[0]).toBe(TALLY_HEADER.join(","));
  });
  it("writes one row per line with rupee amounts", () => {
    expect(rows).toHaveLength(2);
    expect(rows[1]).toBe(
      '02-11-2026,ORD-1002,Sharma General Store,SKU-DT-1KG,"Detergent powder 1 kg, case of 20",5,0,2030.00,304.50,9845.50',
    );
  });
});

describe("csvCell", () => {
  it("quotes cells with commas, quotes and new lines", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });
  it("leaves normal numbers alone", () => {
    expect(csvCell(12)).toBe("12");
  });
});
