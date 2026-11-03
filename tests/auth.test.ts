import { beforeAll, describe, it, expect } from "vitest";
import { signSession, verifyToken } from "@/lib/auth/token";
import { generateOtp, hashOtp, otpMatches } from "@/lib/auth/otp";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-with-more-than-sixteen-chars";
  process.env.OTP_DEMO_MODE = "false";
});

describe("session token", () => {
  it("round-trips a retailer session", async () => {
    const token = await signSession({ uid: "u1", role: "RETAILER", retailerId: "r1" });
    expect(await verifyToken(token)).toEqual({ uid: "u1", role: "RETAILER", retailerId: "r1" });
  });
  it("round-trips a desk session with no retailer", async () => {
    const token = await signSession({ uid: "d1", role: "DESK", retailerId: null });
    expect(await verifyToken(token)).toEqual({ uid: "d1", role: "DESK", retailerId: null });
  });
  it("rejects a tampered token", async () => {
    const token = await signSession({ uid: "u1", role: "RETAILER", retailerId: "r1" });
    const [h, p, s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "u1", role: "DESK", rid: null })).toString("base64url");
    expect(await verifyToken(`${h}.${forged}.${s}`)).toBeNull();
    expect(await verifyToken(`${h}.${p}.AAAA`)).toBeNull();
  });
  it("rejects garbage", async () => {
    expect(await verifyToken("not-a-token")).toBeNull();
  });
});

describe("otp", () => {
  it("generates a 6-digit code", () => {
    expect(generateOtp()).toMatch(/^\d{6}$/);
  });
  it("accepts the right code and rejects others", () => {
    const hash = hashOtp("9000000001", "123456");
    expect(otpMatches("9000000001", "123456", hash)).toBe(true);
    expect(otpMatches("9000000001", "654321", hash)).toBe(false);
    expect(otpMatches("9000000002", "123456", hash)).toBe(false);
  });
});
