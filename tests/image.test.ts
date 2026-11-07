import { describe, it, expect } from "vitest";
import { sniffImage } from "@/server/capture/image";
import { captureBodySchema } from "@/lib/validation";

const b64 = (bytes: number[]) => Buffer.from(bytes).toString("base64");

describe("sniffImage", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(sniffImage(b64([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(sniffImage(b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImage(b64([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
  });
  it("rejects other files, even if renamed", () => {
    expect(sniffImage(Buffer.from("<html>hello</html>").toString("base64"))).toBeNull();
    expect(sniffImage(Buffer.from("GIF89a....").toString("base64"))).toBeNull();
    expect(sniffImage("")).toBeNull();
  });
});

describe("captureBodySchema", () => {
  it("accepts text or an image, not neither", () => {
    expect(captureBodySchema.safeParse({ text: "2 peti tea" }).success).toBe(true);
    expect(captureBodySchema.safeParse({ image: "A".repeat(200) }).success).toBe(true);
    expect(captureBodySchema.safeParse({}).success).toBe(false);
  });
  it("rejects invalid or oversized image data", () => {
    expect(captureBodySchema.safeParse({ image: "not base64 !!!" + "A".repeat(100) }).success).toBe(false);
    expect(captureBodySchema.safeParse({ image: "A".repeat(2_800_001) }).success).toBe(false);
  });
});
