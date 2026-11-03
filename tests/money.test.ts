import { describe, it, expect } from "vitest";
import { applyBp, rupees } from "@/lib/money";

describe("applyBp", () => {
  it("rounds half up", () => {
    expect(applyBp(1250, 300)).toBe(38); // 37.5 -> 38
  });
  it("rounds down below half", () => {
    expect(applyBp(1249, 300)).toBe(37); // 37.47 -> 37
  });
  it("handles zero", () => {
    expect(applyBp(0, 300)).toBe(0);
  });
  it("rejects non-integer paise", () => {
    expect(() => applyBp(10.5, 300)).toThrow(RangeError);
  });
  it("rejects out-of-range basis points", () => {
    expect(() => applyBp(1000, 10001)).toThrow(RangeError);
  });
});

describe("rupees", () => {
  it("formats paise as rupees with two decimals", () => {
    expect(rupees(0)).toBe("0.00");
    expect(rupees(5)).toBe("0.05");
    expect(rupees(810)).toBe("8.10");
    expect(rupees(984_550)).toBe("9845.50");
  });
});
