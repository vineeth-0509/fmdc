import { describe, it, expect } from "vitest";
import { recommend, schemeTiers, type RecItem } from "@/server/product";
import { categoryOf, packInfo } from "@/lib/category";

describe("schemeTiers", () => {
  it("shows free goods for the biscuit scheme", () => {
    const tiers = schemeTiers({
      piecesPerCase: 96,
      piecePricePaise: 810,
      scheme: { type: "FREE_GOODS", buyCases: 10, freeCases: 1 },
    });
    expect(tiers.map((t) => t.qty)).toEqual([9, 10, 20]);
    expect(tiers.map((t) => t.freeCases)).toEqual([0, 1, 2]);
    expect(tiers.map((t) => t.getCases)).toEqual([9, 11, 22]);
  });
  it("shows the slab discount for the detergent scheme", () => {
    const tiers = schemeTiers({
      piecesPerCase: 20,
      piecePricePaise: 10150,
      scheme: { type: "SLAB_PERCENT", minCases: 5, percentBp: 300 },
    });
    expect(tiers.map((t) => t.qty)).toEqual([4, 5, 10]);
    expect(tiers[0].discountPaise).toBe(0);
    expect(tiers[1].discountPaise).toBe(30_450);
    expect(tiers[1].payPaise).toBe(984_550);
  });
  it("returns nothing when there is no scheme", () => {
    expect(schemeTiers({ piecesPerCase: 40, piecePricePaise: 100, scheme: null })).toEqual([]);
  });
});

describe("recommend", () => {
  const items: RecItem[] = [
    { id: "b75", category: "BS", stockCases: 10, hasScheme: true },
    { id: "b150", category: "BS", stockCases: 10, hasScheme: false },
    { id: "d1", category: "DT", stockCases: 10, hasScheme: true },
    { id: "t1", category: "TE", stockCases: 0, hasScheme: false },
    { id: "s1", category: "SP", stockCases: 10, hasScheme: false },
  ];
  it("groups other sizes, frequent orders and schemes without repeats", () => {
    const r = recommend("b75", items, new Map([["s1", 3]]));
    expect(r.otherSizes).toEqual(["b150"]);
    expect(r.often).toEqual(["s1"]);
    expect(r.onScheme).toEqual(["d1"]);
  });
  it("never recommends the current product or out-of-stock products", () => {
    const r = recommend("b75", items, new Map([["t1", 9]]));
    expect([...r.otherSizes, ...r.often, ...r.onScheme].includes("t1")).toBe(false);
    expect([...r.otherSizes, ...r.often, ...r.onScheme].includes("b75")).toBe(false);
  });
});

describe("category helpers", () => {
  it("reads the category from the SKU code", () => {
    expect(categoryOf("SKU-BS-075")).toBe("BS");
    expect(categoryOf("weird")).toBe("OTHER");
  });
  it("splits a name into title and weight", () => {
    expect(packInfo("Glucose biscuit 75 g, case of 96")).toEqual({ title: "Glucose biscuit", weight: "75 g" });
    expect(packInfo("Detergent powder 1 kg, case of 20")).toEqual({ title: "Detergent powder", weight: "1 kg" });
  });
});
