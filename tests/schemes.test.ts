import { describe, it, expect } from "vitest";
import { priceLine, priceOrder, SchemeInputError, type Scheme } from "@/server/schemes/engine";

const buy10get1: Scheme = { type: "FREE_GOODS", buyCases: 10, freeCases: 1 };
const slab3: Scheme = { type: "SLAB_PERCENT", minCases: 5, percentBp: 300 };

// Glucose biscuit: ₹8.10 per piece, 96 per case
const biscuit = (qtyCases: number) =>
  priceLine({ qtyCases, piecesPerCase: 96, piecePricePaise: 810, scheme: buy10get1 });

// Detergent 1 kg: ₹101.50 per piece, 20 per case
const detergent = (qtyCases: number) =>
  priceLine({ qtyCases, piecesPerCase: 20, piecePricePaise: 10150, scheme: slab3 });

describe("buy 10 get 1 free", () => {
  it("gives nothing below the threshold", () => {
    expect(biscuit(9).freeCases).toBe(0);
  });
  it("gives 1 free at exactly 10", () => {
    const r = biscuit(10);
    expect(r.freeCases).toBe(1);
    expect(r.deliveredCases).toBe(11);
    expect(r.grossPaise).toBe(777_600); // 810 * 96 * 10
    expect(r.lineTotalPaise).toBe(777_600); // free goods do not change the price
  });
  it("gives 1 free at 19", () => {
    expect(biscuit(19).freeCases).toBe(1);
  });
  it("gives 2 free at 20", () => {
    expect(biscuit(20).freeCases).toBe(2);
  });
  it("gives 2 free at 25", () => {
    expect(biscuit(25).freeCases).toBe(2);
  });
});

describe("3% off at 5 or more cases", () => {
  it("gives no discount at 4 cases", () => {
    const r = detergent(4);
    expect(r.discountPaise).toBe(0);
    expect(r.lineTotalPaise).toBe(812_000);
  });
  it("gives 3% off at exactly 5 cases", () => {
    const r = detergent(5);
    expect(r.grossPaise).toBe(1_015_000);
    expect(r.discountPaise).toBe(30_450);
    expect(r.lineTotalPaise).toBe(984_550);
  });
  it("applies to the whole line above the threshold", () => {
    expect(detergent(8).discountPaise).toBe(48_720); // 3% of 1,624,000
  });
  it("rounds half up", () => {
    // gross = 50 * 5 * 5 = 1250 -> 3% = 37.5 -> 38
    const r = priceLine({ qtyCases: 5, piecesPerCase: 5, piecePricePaise: 50, scheme: slab3 });
    expect(r.discountPaise).toBe(38);
  });
  it("rounds down below half", () => {
    const r = priceLine({
      qtyCases: 1,
      piecesPerCase: 1,
      piecePricePaise: 1249,
      scheme: { type: "SLAB_PERCENT", minCases: 1, percentBp: 300 },
    });
    expect(r.discountPaise).toBe(37);
  });
});

describe("no scheme", () => {
  it("charges the gross amount", () => {
    const r = priceLine({ qtyCases: 3, piecesPerCase: 40, piecePricePaise: 11800, scheme: null });
    expect(r.freeCases).toBe(0);
    expect(r.discountPaise).toBe(0);
    expect(r.lineTotalPaise).toBe(1_416_000);
  });
});

describe("invalid input", () => {
  it.each([0, -1, 1.5, NaN])("rejects qtyCases = %s", (qty) => {
    expect(() => biscuit(qty)).toThrow(SchemeInputError);
  });
  it("rejects a bad scheme definition", () => {
    expect(() =>
      priceLine({
        qtyCases: 5,
        piecesPerCase: 20,
        piecePricePaise: 100,
        scheme: { type: "FREE_GOODS", buyCases: 0, freeCases: 1 },
      }),
    ).toThrow(SchemeInputError);
  });
});

describe("priceOrder", () => {
  it("sums lines", () => {
    const r = priceOrder([
      { qtyCases: 10, piecesPerCase: 96, piecePricePaise: 810, scheme: buy10get1 },
      { qtyCases: 5, piecesPerCase: 20, piecePricePaise: 10150, scheme: slab3 },
    ]);
    expect(r.subtotalPaise).toBe(777_600 + 1_015_000);
    expect(r.discountPaise).toBe(30_450);
    expect(r.totalPaise).toBe(777_600 + 984_550);
  });
});
