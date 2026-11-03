import { describe, it, expect } from "vitest";
import { captureSchema, lineEditSchema, orderActionSchema, otpSendSchema, placeSchema, previewSchema } from "@/lib/validation";

describe("input validation", () => {
  it("accepts only 10-digit phone numbers", () => {
    expect(otpSendSchema.safeParse({ phone: "9000000001" }).success).toBe(true);
    expect(otpSendSchema.safeParse({ phone: "90000" }).success).toBe(false);
    expect(otpSendSchema.safeParse({ phone: "90000000a1" }).success).toBe(false);
  });
  it("rejects zero, negative, fractional and huge quantities", () => {
    for (const q of [0, -2, 1.5, 10_000]) {
      expect(previewSchema.safeParse({ lines: [{ skuId: "a", qtyCases: q }] }).success).toBe(false);
    }
    expect(previewSchema.safeParse({ lines: [{ skuId: "a", qtyCases: 3 }] }).success).toBe(true);
  });
  it("rejects an empty cart", () => {
    expect(placeSchema.safeParse({ lines: [] }).success).toBe(false);
  });
  it("limits message length", () => {
    expect(captureSchema.safeParse({ text: "x".repeat(1001) }).success).toBe(false);
    expect(captureSchema.safeParse({ text: " " }).success).toBe(false);
  });
  it("requires a reason to reject an order", () => {
    expect(orderActionSchema.safeParse({ action: "reject" }).success).toBe(false);
    expect(orderActionSchema.safeParse({ action: "reject", reason: "ok" }).success).toBe(false);
    expect(orderActionSchema.safeParse({ action: "reject", reason: "Item discontinued" }).success).toBe(true);
    expect(orderActionSchema.safeParse({ action: "confirm" }).success).toBe(true);
    expect(orderActionSchema.safeParse({ action: "delete" }).success).toBe(false);
  });
  it("needs at least one change on a line edit", () => {
    expect(lineEditSchema.safeParse({}).success).toBe(false);
    expect(lineEditSchema.safeParse({ qtyCases: 4 }).success).toBe(true);
  });
});
