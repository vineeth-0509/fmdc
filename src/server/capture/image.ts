/** Checks the real file type from its first bytes, so a renamed file is not trusted. */
export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

export const MAX_IMAGE_BASE64_CHARS = 2_800_000; // about 2 MB once decoded

export function sniffImage(base64: string): ImageMime | null {
  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64.slice(0, 64), "base64");
  } catch {
    return null;
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
