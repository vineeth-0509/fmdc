import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { CaptureResult } from "@/lib/capture-types";
import { buildCaptureLines, splitMessage, type SegmentInput } from "@/server/capture/rules";
import { parseImageWithLlm, parseWithLlm } from "@/server/capture/llm";
import { sniffImage } from "@/server/capture/image";

export const aiConfigured = () => Boolean(process.env.LLM_API_KEY && process.env.LLM_MODEL);

async function loadContext(retailerId: string) {
  const [skus, aliasRows, pastRows] = await Promise.all([
    prisma.sku.findMany({
      where: { active: true, prices: { some: { retailerId } } },
      orderBy: { code: "asc" },
    }),
    prisma.alias.findMany({ where: { retailerId }, include: { sku: { select: { code: true } } } }),
    prisma.orderLine.findMany({
      where: { order: { retailerId } },
      select: { skuId: true },
      distinct: ["skuId"],
      take: 100,
    }),
  ]);
  return {
    skus,
    aliasRows,
    aliases: aliasRows.map((a) => ({ phrase: a.phrase, skuId: a.skuId })),
    past: new Set(pastRows.map((p) => p.skuId)),
    catalogue: skus.map((s) => ({ code: s.code, name: s.name })),
    aliasCodes: aliasRows.map((a) => ({ phrase: a.phrase, code: a.sku.code })),
  };
}

type Ctx = Awaited<ReturnType<typeof loadContext>>;

async function finish(
  retailerId: string,
  ctx: Ctx,
  segments: SegmentInput[],
  mode: "ai" | "rules",
  notice: string | null,
  rawText: string,
): Promise<CaptureResult> {
  const lines = buildCaptureLines(
    segments,
    ctx.skus.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      nameHi: s.nameHi,
      stockCases: s.stockCases,
      piecesPerCase: s.piecesPerCase,
    })),
    ctx.aliases,
    ctx.past,
  );
  const saved = await prisma.capture.create({
    data: { retailerId, rawText, resultJson: { mode, notice, lines } as unknown as Prisma.InputJsonValue },
  });
  return { captureId: saved.id, mode, notice, lines };
}

export async function captureOrder(retailerId: string, text: string): Promise<CaptureResult> {
  const ctx = await loadContext(retailerId);

  let mode: "ai" | "rules" = "rules";
  let notice: string | null = null;
  let segments: SegmentInput[] = splitMessage(text).map((original) => ({ original }));

  if (aiConfigured()) {
    try {
      const llmLines = await parseWithLlm(text, ctx.catalogue, ctx.aliasCodes);
      if (llmLines.length > 0) {
        segments = llmLines.map((l) => ({ original: l.original, hint: { skuCode: l.skuCode, quantity: l.quantity } }));
        mode = "ai";
      }
    } catch (e) {
      console.error("LLM order capture failed, using keyword matching:", e);
      notice = "The AI reader is not available right now, so we matched by keywords. Please check each line.";
    }
  } else {
    notice = "AI reading is switched off here, so we matched by keywords. Please check each line.";
  }

  return finish(retailerId, ctx, segments, mode, notice, text);
}

/** Reads a photo of an order list. The image is sent to the AI and is not stored. */
export async function captureOrderFromImage(retailerId: string, imageBase64: string): Promise<CaptureResult> {
  if (!aiConfigured()) {
    throw new AppError(503, "AI_OFF", "Photo reading needs the AI reader, which is switched off. Please type your order instead.");
  }
  const mime = sniffImage(imageBase64);
  if (!mime) throw new AppError(400, "INVALID_IMAGE", "That file is not a JPEG, PNG or WebP photo.");

  const ctx = await loadContext(retailerId);
  let llmLines;
  try {
    llmLines = await parseImageWithLlm(imageBase64, mime, ctx.catalogue, ctx.aliasCodes);
  } catch (e) {
    console.error("LLM photo capture failed:", e);
    throw new AppError(502, "AI_FAILED", "We could not read this photo. Retake it in good light, or type your order.");
  }
  if (llmLines.length === 0) {
    throw new AppError(422, "UNREADABLE", "We could not find any items in this photo. Retake it closer and in good light, or type your order.");
  }

  const segments: SegmentInput[] = llmLines.map((l) => ({
    original: l.original,
    hint: { skuCode: l.skuCode, quantity: l.quantity },
  }));
  const rawText = `Photo of a list:\n${llmLines.map((l) => l.original).join("\n")}`;
  return finish(
    retailerId,
    ctx,
    segments,
    "ai",
    "Read from your photo. Handwriting can be misread, so please check every line.",
    rawText,
  );
}
