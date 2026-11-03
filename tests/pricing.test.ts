import { describe, it, expect } from "vitest";
import { creditDecision, mergeLines, priceCartLines, type SkuForPricing } from "@/server/pricing";

const sku = (over: Partial<SkuForPricing> & { id: string }): SkuForPricing => ({
  code: "SKU-X",
  name: "Item",
  nameHi: null,
  piecesPerCase: 96,
  stockCases: 340,
  active: true,
  scheme: null,
  ...over,
});

const biscuit = (stock = 340) =>
  sku({ id: "b", code: "SKU-BS-075", name: "Glucose biscuit", stockCases: stock, scheme: { type: "FREE_GOODS", buyCases: 10, freeCases: 1 } });
const tea = sku({ id: "t", code: "SKU-TE-250", name: "Tea leaf", piecesPerCase: 40, stockCases: 0 });

const maps = (...skus: SkuForPricing[]) => ({
  skus: new Map(skus.map((s) => [s.id, s])),
  prices: new Map<string, number>([
    ["b", 810],
    ["t", 11800],
  ]),
});

describe("priceCartLines", () => {
  it("prices free goods and counts delivered cases", () => {
    const { skus, prices } = maps(biscuit());
    const cart = priceCartLines([{ skuId: "b", qtyCases: 10 }], skus, prices);
    expect(cart.lines[0].freeCases).toBe(1);
    expect(cart.lines[0].deliveredCases).toBe(11);
    expect(cart.lines[0].problem).toBeNull();
    expect(cart.totalPaise).toBe(777_600);
  });

  it("blocks a line when the SKU is out of stock", () => {
    const { skus, prices } = maps(tea);
    const cart = priceCartLines([{ skuId: "t", qtyCases: 1 }], skus, prices);
    expect(cart.lines[0].problem).toBe("OUT_OF_STOCK");
  });

  it("counts free cases against stock", () => {
    const { skus, prices } = maps(biscuit(10));
    expect(priceCartLines([{ skuId: "b", qtyCases: 10 }], skus, prices).lines[0].problem).toBe("EXCEEDS_STOCK");
    expect(priceCartLines([{ skuId: "b", qtyCases: 9 }], skus, prices).lines[0].problem).toBeNull();
  });

  it("merges the same product so schemes see the combined quantity", () => {
    const { skus, prices } = maps(biscuit());
    const cart = priceCartLines(
      [
        { skuId: "b", qtyCases: 6 },
        { skuId: "b", qtyCases: 4 },
      ],
      skus,
      prices,
    );
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].qtyCases).toBe(10);
    expect(cart.lines[0].freeCases).toBe(1);
  });

  it("marks products with no price or no record as unavailable", () => {
    const { skus, prices } = maps(biscuit());
    const cart = priceCartLines([{ skuId: "missing", qtyCases: 2 }], skus, prices);
    expect(cart.lines[0].problem).toBe("UNAVAILABLE");
    expect(cart.totalPaise).toBe(0);
  });

  it("does not offer inactive products", () => {
    const { skus, prices } = maps({ ...biscuit(), active: false });
    expect(priceCartLines([{ skuId: "b", qtyCases: 1 }], skus, prices).lines[0].problem).toBe("UNAVAILABLE");
  });
});

describe("mergeLines", () => {
  it("keeps the first original text", () => {
    const merged = mergeLines([
      { skuId: "b", qtyCases: 1, originalText: "biscuit" },
      { skuId: "b", qtyCases: 2, originalText: "other" },
    ]);
    expect(merged).toEqual([{ skuId: "b", qtyCases: 3, originalText: "biscuit" }]);
  });
});

describe("creditDecision", () => {
  it("allows an order that ends exactly at the limit", () => {
    expect(creditDecision(1_800_000, 2_000_000, 200_000)).toBe("OK");
  });
  it("holds an order that goes over the limit", () => {
    expect(creditDecision(1_800_000, 2_000_000, 200_001)).toBe("HOLD");
  });
});
