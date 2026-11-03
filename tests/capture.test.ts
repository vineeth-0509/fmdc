import { describe, it, expect } from "vitest";
import { buildCaptureLines, parseSegment, splitMessage, type SkuFull } from "@/server/capture/rules";
import { extractJson } from "@/server/capture/json";

const sku = (id: string, code: string, name: string, stock: number, ppc: number): SkuFull => ({
  id,
  code,
  name,
  nameHi: null,
  stockCases: stock,
  piecesPerCase: ppc,
});

const CATALOGUE = [
  sku("1", "SKU-BS-075", "Glucose biscuit 75 g, case of 96", 340, 96),
  sku("2", "SKU-DT-1KG", "Detergent powder 1 kg, case of 20", 85, 20),
  sku("3", "SKU-TE-250", "Tea leaf 250 g, case of 40", 0, 40),
  sku("4", "SKU-BS-150", "Cream biscuit 150 g, case of 48", 210, 48),
  sku("5", "SKU-DT-500", "Detergent powder 500 g, case of 40", 120, 40),
  sku("6", "SKU-TE-100", "Tea leaf 100 g, case of 80", 60, 80),
];

const SAMPLE = "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti";
const run = (text: string, aliases: { phrase: string; skuId: string }[] = []) =>
  buildCaptureLines(splitMessage(text).map((original) => ({ original })), CATALOGUE, aliases, new Set());

describe("sample message from the brief", () => {
  const lines = run(SAMPLE);

  it("finds three lines", () => {
    expect(lines).toHaveLength(3);
  });
  it("maps the biscuit line to 75 g, but asks for a size check", () => {
    expect(lines[0].chosen?.code).toBe("SKU-BS-075");
    expect(lines[0].quantity).toBe(5);
    expect(lines[0].confidence).toBe("MEDIUM");
    expect(lines[0].alternatives.map((a) => a.code)).toContain("SKU-BS-150");
  });
  it("maps washing powder 1 kilo to the 1 kg pack with high confidence", () => {
    expect(lines[1].chosen?.code).toBe("SKU-DT-1KG");
    expect(lines[1].quantity).toBe(2);
    expect(lines[1].confidence).toBe("HIGH");
  });
  it("matches the tea line but flags it as out of stock", () => {
    expect(lines[2].chosen?.code).toBe("SKU-TE-250");
    expect(lines[2].quantity).toBe(1);
    expect(lines[2].outOfStock).toBe(true);
  });
  it("treats peti as cases, so no unit question is needed", () => {
    expect(lines.every((l) => l.unit === "CASE" && !l.needsUnitConfirm)).toBe(true);
  });
});

describe("units are asked, not guessed", () => {
  it("flags a missing unit", () => {
    const [l] = run("biscuit 5");
    expect(l.quantity).toBe(5);
    expect(l.unit).toBe("UNKNOWN");
    expect(l.needsUnitConfirm).toBe(true);
  });
  it("flags pieces and offers the case equivalent when it divides evenly", () => {
    const [l] = run("192 pcs glucose biscuit");
    expect(l.unit).toBe("PIECE");
    expect(l.needsUnitConfirm).toBe(true);
    expect(l.suggestedCases).toBe(2);
  });
  it("flags a missing quantity", () => {
    const [l] = run("peti detergent 500 g");
    expect(l.quantity).toBeNull();
    expect(l.needsUnitConfirm).toBe(true);
  });
});

describe("matching", () => {
  it("returns no choice when nothing matches, instead of guessing", () => {
    const [l] = run("4 peti something unknown");
    expect(l.chosen).toBeNull();
    expect(l.confidence).toBe("NONE");
  });
  it("tolerates small spelling mistakes", () => {
    const [l] = run("2 peti biscuet chhota");
    expect(l.chosen?.code).toBe("SKU-BS-075");
  });
  it("skips greetings with nothing to order", () => {
    expect(run("bhaiya")).toHaveLength(0);
  });
  it("uses a saved alias with high confidence", () => {
    const [l] = run("3 peti biscuit chhota", [{ phrase: "biscuit chhota", skuId: "4" }]);
    expect(l.chosen?.code).toBe("SKU-BS-150");
    expect(l.confidence).toBe("HIGH");
  });
  it("uses an LLM suggestion only when the code is in the catalogue", () => {
    const [l] = buildCaptureLines(
      [{ original: "5 peti kuch aur", hint: { skuCode: "SKU-TE-100", quantity: 5 } }],
      CATALOGUE,
      [],
      new Set(),
    );
    expect(l.chosen?.code).toBe("SKU-TE-100");
    expect(l.confidence).toBe("MEDIUM");
  });
});

describe("parseSegment", () => {
  it("separates quantity, unit and size", () => {
    const p = parseSegment("chai patti 250 wala 1 peti");
    expect(p.quantity).toBe(1);
    expect(p.unit).toBe("CASE");
    expect(p.sizeValue).toBe(250);
    expect(p.tokens).toEqual(["chai", "patti"]);
  });
  it("builds a key that includes the size", () => {
    expect(parseSegment("2 peti washing powder 1 kilo").productKey).toBe("washing powder 1000");
  });
});

describe("splitMessage", () => {
  it("splits on commas, new lines and 'aur'", () => {
    expect(splitMessage("2 peti tea aur 3 peti soap\n1 peti namkeen")).toHaveLength(3);
  });
});

describe("extractJson", () => {
  it("reads JSON wrapped in prose or fences", () => {
    expect(extractJson('Here you go:\n```json\n{"lines":[]}\n```')).toEqual({ lines: [] });
  });
  it("throws when there is no JSON", () => {
    expect(() => extractJson("sorry, I cannot help")).toThrow();
  });
});
