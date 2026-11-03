import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CaptureResult } from "@/lib/capture-types";
import { buildCaptureLines, splitMessage, type SegmentInput } from "@/server/capture/rules";
import { parseWithLlm } from "@/server/capture/llm";

export async function captureOrder(retailerId: string, text: string): Promise<CaptureResult> {
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

  const aliases = aliasRows.map((a) => ({ phrase: a.phrase, skuId: a.skuId }));
  const past = new Set(pastRows.map((p) => p.skuId));

  let mode: "ai" | "rules" = "rules";
  let notice: string | null = null;
  let segments: SegmentInput[] = splitMessage(text).map((original) => ({ original }));

  if (process.env.LLM_API_KEY && process.env.LLM_MODEL) {
    try {
      const llmLines = await parseWithLlm(
        text,
        skus.map((s) => ({ code: s.code, name: s.name })),
        aliasRows.map((a) => ({ phrase: a.phrase, code: a.sku.code })),
      );
      if (llmLines.length > 0) {
        segments = llmLines.map((l) => ({
          original: l.original,
          hint: { skuCode: l.skuCode, quantity: l.quantity },
        }));
        mode = "ai";
      }
    } catch (e) {
      console.error("LLM order capture failed, using keyword matching:", e);
      notice = "The AI reader is not available right now, so we matched by keywords. Please check each line.";
    }
  } else {
    notice = "AI reading is switched off here, so we matched by keywords. Please check each line.";
  }

  const lines = buildCaptureLines(
    segments,
    skus.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      nameHi: s.nameHi,
      stockCases: s.stockCases,
      piecesPerCase: s.piecesPerCase,
    })),
    aliases,
    past,
  );

  const saved = await prisma.capture.create({
    data: {
      retailerId,
      rawText: text,
      resultJson: { mode, notice, lines } as unknown as Prisma.InputJsonValue,
    },
  });

  return { captureId: saved.id, mode, notice, lines };
}
