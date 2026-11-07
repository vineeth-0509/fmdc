import { describe, it, expect } from "vitest";
import { inflateRawSync } from "node:zlib";
import { buildXlsx, colName, excelDateSerial, safeSheetNames } from "@/server/export/xlsx";

/** Reads the files out of a zip, to check what buildXlsx wrote. */
function unzip(buf: Buffer): Map<string, string> {
  const out = new Map<string, string>();
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(offset + 26);
    const lxlen = buf.readUInt16LE(offset + 28);
    const start = offset + 30 + lnlen + lxlen;
    const data = buf.subarray(start, start + csize);
    out.set(name, (method === 8 ? inflateRawSync(data) : data).toString("utf8"));
    p += 46 + nlen;
  }
  return out;
}

describe("buildXlsx", () => {
  const file = buildXlsx([
    { name: "Summary", rows: [[{ v: "Order report", s: "title" }], ["Shop", { v: 1234.5, s: "money" }]], widths: [30, 14] },
    {
      name: "A/B: shop?",
      freezeRows: 1,
      rows: [[{ v: "Shop", s: "header" }], ["Gupta & <Sons> \"x\"", new Date("2026-11-02T08:00:00Z"), null, { v: 7, s: "int" }]],
    },
  ]);
  const parts = unzip(file);

  it("is a zip with the required Excel parts", () => {
    expect(file.subarray(0, 2).toString()).toBe("PK");
    for (const name of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]) {
      expect(parts.has(name)).toBe(true);
    }
  });
  it("cleans sheet names", () => {
    const wb = parts.get("xl/workbook.xml") ?? "";
    expect(wb).toContain('name="Summary"');
    expect(wb).toContain('name="A B shop"');
  });
  it("escapes text and writes numbers, dates and a frozen header", () => {
    const s2 = parts.get("xl/worksheets/sheet2.xml") ?? "";
    expect(s2).toContain("Gupta &amp; &lt;Sons&gt; &quot;x&quot;");
    expect(s2).toContain(`<v>${excelDateSerial(new Date("2026-11-02T08:00:00Z"))}</v>`);
    expect(s2).toContain('state="frozen"');
    const s1 = parts.get("xl/worksheets/sheet1.xml") ?? "";
    expect(s1).toContain("<v>1234.5</v>");
    expect(s1).toContain('<col min="1" max="1" width="30" customWidth="1"/>');
  });
  it("never writes text as a formula", () => {
    const f = buildXlsx([{ name: "T", rows: [["=SUM(A1:A2)"]] }]);
    const sheet = unzip(f).get("xl/worksheets/sheet1.xml") ?? "";
    expect(sheet).toContain('t="inlineStr"');
    expect(sheet.includes("<f>")).toBe(false);
  });
});

describe("helpers", () => {
  it("names columns like a spreadsheet", () => {
    expect(colName(0)).toBe("A");
    expect(colName(25)).toBe("Z");
    expect(colName(26)).toBe("AA");
    expect(colName(27)).toBe("AB");
  });
  it("makes sheet names unique and at most 31 characters", () => {
    const names = safeSheetNames(["Shop", "shop", "x".repeat(40)]);
    expect(names[0]).toBe("Shop");
    expect(names[1]).toBe("shop 2");
    expect(names[2]).toHaveLength(31);
  });
  it("converts a date to an Excel serial for the IST day", () => {
    expect(excelDateSerial(new Date("2026-11-04T10:00:00Z"))).toBe(46330);
  });
});
