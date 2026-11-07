/**
 * Optional: creates one clean product picture per SKU with a Google image model and saves it to
 * public/products/<SKU code>.png. The pictures are generic (no brand names) and illustrative, so check each one.
 *
 * Needs in .env: DATABASE_URL, LLM_API_KEY and IMAGE_MODEL (run `npm run ai:models` to see image models).
 * Run: npm run ai:images            (skips products that already have a picture)
 *      npm run ai:images -- --force (redo all)
 * Then set NEXT_PUBLIC_PRODUCT_PHOTOS=true and restart.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KIND: Record<string, string> = {
  BS: "a flow-wrapped biscuit packet",
  DT: "a cardboard box of washing powder",
  TE: "a tea leaf carton",
  DS: "a wrapped dish wash bar",
  FL: "a plastic floor cleaner bottle",
  NS: "a snack pouch of salted namkeen",
  SP: "a wrapped bar of soap",
};

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const key = process.env.LLM_API_KEY?.trim();
  const model = process.env.IMAGE_MODEL?.trim().replace(/^models\//, "");
  if (!key || !model) {
    console.error("Set LLM_API_KEY and IMAGE_MODEL in .env first (run `npm run ai:models` to see image models).");
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  const dir = path.join(process.cwd(), "public", "products");
  await mkdir(dir, { recursive: true });

  const skus = await prisma.sku.findMany({ orderBy: { code: "asc" } });
  for (const sku of skus) {
    const file = path.join(dir, `${sku.code}.png`);
    if (!force && (await exists(file))) {
      console.log(`skip  ${sku.code} (already has a picture)`);
      continue;
    }
    const cat = sku.code.split("-")[1] ?? "";
    const weight = /(\d+(?:\.\d+)?\s*(?:kg|g|ml|l))\b/i.exec(sku.name)?.[1] ?? "";
    const prompt =
      `Studio product photo of ${KIND[cat] ?? "a retail pack"}, front view, centred, soft natural shadow, ` +
      `plain light background, realistic packaging. Generic unbranded design with a plain white label ` +
      `${weight ? `that shows only "${weight}"` : ""}. No logos, no brand names, no other text.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
    if (!res.ok) {
      console.error(`fail  ${sku.code}: Google returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
      continue;
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { data?: string }; inline_data?: { data?: string } }[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data || p.inline_data?.data);
    const b64 = part?.inlineData?.data ?? part?.inline_data?.data;
    if (!b64) {
      console.error(`fail  ${sku.code}: the model returned no image`);
      continue;
    }
    await writeFile(file, Buffer.from(b64, "base64"));
    console.log(`saved ${sku.code}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
