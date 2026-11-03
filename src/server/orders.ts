import { Prisma, type OrderSource, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { loadPricingData } from "@/server/catalogue";
import { parseSegment } from "@/server/capture/rules";
import {
  creditDecision,
  mergeLines,
  priceCartLines,
  type CartLineInput,
  type PricedCart,
  type PricedLine,
} from "@/server/pricing";

const OPEN: OrderStatus[] = ["PLACED", "CREDIT_HOLD"];
const isOpen = (s: OrderStatus) => OPEN.includes(s);

export type CartPreview = PricedCart & { creditHold: boolean; canPlace: boolean };

function problemMessage(l: PricedLine): string {
  if (l.problem === "UNAVAILABLE") return `${l.name} is not available for you right now.`;
  if (l.problem === "OUT_OF_STOCK") return `${l.name} is out of stock.`;
  return `${l.name}: only ${l.stockCases} cases in stock (free cases count too).`;
}

export async function previewCart(retailerId: string, lines: CartLineInput[]): Promise<CartPreview> {
  const merged = mergeLines(lines);
  const { skus, prices } = await loadPricingData(prisma, retailerId, merged.map((l) => l.skuId));
  const cart = priceCartLines(merged, skus, prices);
  const retailer = await prisma.retailer.findUnique({ where: { id: retailerId } });
  if (!retailer) throw new AppError(404, "NOT_FOUND", "Retailer not found.");
  const creditHold =
    creditDecision(retailer.outstandingPaise, retailer.creditLimitPaise, cart.totalPaise) === "HOLD";
  return { ...cart, creditHold, canPlace: cart.lines.length > 0 && cart.lines.every((l) => !l.problem) };
}

export async function placeOrder(p: {
  retailerId: string;
  userId: string;
  lines: CartLineInput[];
  captureId?: string | null;
  note?: string | null;
}): Promise<{ id: string; seq: number; status: OrderStatus }> {
  const merged = mergeLines(p.lines);
  if (merged.length === 0) throw new AppError(400, "EMPTY_CART", "Your cart is empty.");
  const ids = merged.map((l) => l.skuId);

  return prisma.$transaction(async (tx) => {
    // Lock the stock rows so two orders cannot take the same cases.
    await tx.$queryRaw`SELECT id FROM "Sku" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;

    const { skus, prices } = await loadPricingData(tx, p.retailerId, ids);
    const cart = priceCartLines(merged, skus, prices);
    const bad = cart.lines.find((l) => l.problem);
    if (bad) {
      throw new AppError(409, bad.problem === "UNAVAILABLE" ? "UNAVAILABLE" : "INSUFFICIENT_STOCK", problemMessage(bad));
    }

    const retailer = await tx.retailer.findUnique({ where: { id: p.retailerId } });
    if (!retailer) throw new AppError(404, "NOT_FOUND", "Retailer not found.");

    let source: OrderSource = "APP";
    let captureId: string | null = null;
    if (p.captureId) {
      const capture = await tx.capture.findFirst({ where: { id: p.captureId, retailerId: p.retailerId } });
      if (!capture) throw new AppError(400, "INVALID_INPUT", "That message capture was not found.");
      source = "AI";
      captureId = capture.id;
    }

    const hold = creditDecision(retailer.outstandingPaise, retailer.creditLimitPaise, cart.totalPaise) === "HOLD";
    const status: OrderStatus = hold ? "CREDIT_HOLD" : "PLACED";

    const order = await tx.order.create({
      data: {
        retailerId: p.retailerId,
        source,
        status,
        subtotalPaise: cart.subtotalPaise,
        discountPaise: cart.discountPaise,
        totalPaise: cart.totalPaise,
        note: p.note?.trim() || null,
        captureId,
        lines: {
          create: cart.lines.map((l) => ({
            skuId: l.skuId,
            qtyCases: l.qtyCases,
            freeCases: l.freeCases,
            piecePricePaise: l.piecePricePaise,
            discountPaise: l.discountPaise,
            lineTotalPaise: l.lineTotalPaise,
            originalText: l.originalText?.slice(0, 200) ?? null,
          })),
        },
        events: {
          create: {
            actorId: p.userId,
            action: hold ? "CREDIT_HOLD" : "PLACED",
            note: hold ? "Order is above the credit limit and needs desk approval." : null,
          },
        },
      },
    });

    for (const l of cart.lines) {
      await tx.sku.update({ where: { id: l.skuId }, data: { stockCases: { decrement: l.deliveredCases } } });
    }
    return { id: order.id, seq: order.seq, status };
  });
}

export async function confirmOrder(
  orderId: string,
  actorId: string,
): Promise<{ status: "CONFIRMED" | "CREDIT_HOLD"; message: string }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, "NOT_FOUND", "Order not found.");
    if (!isOpen(order.status)) throw new AppError(409, "BAD_STATE", "Only orders awaiting review can be confirmed.");

    await tx.$queryRaw`SELECT id FROM "Retailer" WHERE id = ${order.retailerId} FOR UPDATE`;
    const retailer = await tx.retailer.findUniqueOrThrow({ where: { id: order.retailerId } });
    const over = creditDecision(retailer.outstandingPaise, retailer.creditLimitPaise, order.totalPaise) === "HOLD";

    if (over && order.status === "PLACED") {
      await tx.order.update({ where: { id: orderId }, data: { status: "CREDIT_HOLD" } });
      await tx.orderEvent.create({
        data: { orderId, actorId, action: "CREDIT_HOLD", note: "Confirming would exceed the credit limit." },
      });
      return {
        status: "CREDIT_HOLD" as const,
        message: "This order would take the retailer over the credit limit, so it moved to credit hold. Release it if you approve.",
      };
    }

    await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
    await tx.retailer.update({ where: { id: retailer.id }, data: { outstandingPaise: { increment: order.totalPaise } } });
    await tx.orderEvent.create({
      data: {
        orderId,
        actorId,
        action: over ? "RELEASED" : "CONFIRMED",
        note: over ? "Released by the desk above the credit limit." : null,
      },
    });
    return { status: "CONFIRMED" as const, message: over ? "Order released and confirmed." : "Order confirmed." };
  });
}

export async function rejectOrder(orderId: string, actorId: string, reason: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { lines: true } });
    if (!order) throw new AppError(404, "NOT_FOUND", "Order not found.");
    if (!isOpen(order.status)) throw new AppError(409, "BAD_STATE", "Only orders awaiting review can be rejected.");

    for (const l of order.lines) {
      await tx.sku.update({ where: { id: l.skuId }, data: { stockCases: { increment: l.qtyCases + l.freeCases } } });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "REJECTED" } });
    await tx.orderEvent.create({ data: { orderId, actorId, action: "REJECTED", note: reason } });
  });
}

/**
 * Desk correction of one line. Re-prices from server data, moves stock, and, when the product
 * changed on an AI line, saves the retailer's own words as an alias for next time.
 */
export async function editOrderLine(
  orderId: string,
  lineId: string,
  actorId: string,
  patch: { skuId?: string; qtyCases?: number },
): Promise<{ aliasPhrase: string | null }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { lines: true } });
    if (!order) throw new AppError(404, "NOT_FOUND", "Order not found.");
    if (!isOpen(order.status)) throw new AppError(409, "BAD_STATE", "Only orders awaiting review can be edited.");
    const line = order.lines.find((l) => l.id === lineId);
    if (!line) throw new AppError(404, "NOT_FOUND", "Line not found.");

    const newSkuId = patch.skuId ?? line.skuId;
    const newQty = patch.qtyCases ?? line.qtyCases;
    if (newSkuId === line.skuId && newQty === line.qtyCases) {
      throw new AppError(400, "NO_CHANGE", "Nothing to change.");
    }

    const ids = [...new Set([line.skuId, newSkuId])];
    await tx.$queryRaw`SELECT id FROM "Sku" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;

    // Put the old line's cases back, then price the new line against the restored stock.
    await tx.sku.update({ where: { id: line.skuId }, data: { stockCases: { increment: line.qtyCases + line.freeCases } } });
    const { skus, prices } = await loadPricingData(tx, order.retailerId, [newSkuId]);
    const priced = priceCartLines([{ skuId: newSkuId, qtyCases: newQty }], skus, prices).lines[0];
    if (priced.problem) throw new AppError(409, "CANNOT_EDIT", problemMessage(priced));

    await tx.orderLine.update({
      where: { id: lineId },
      data: {
        skuId: newSkuId,
        qtyCases: priced.qtyCases,
        freeCases: priced.freeCases,
        piecePricePaise: priced.piecePricePaise,
        discountPaise: priced.discountPaise,
        lineTotalPaise: priced.lineTotalPaise,
      },
    });
    await tx.sku.update({ where: { id: newSkuId }, data: { stockCases: { decrement: priced.deliveredCases } } });

    const all = await tx.orderLine.findMany({ where: { orderId } });
    const discount = all.reduce((s, l) => s + l.discountPaise, 0);
    const total = all.reduce((s, l) => s + l.lineTotalPaise, 0);
    await tx.order.update({
      where: { id: orderId },
      data: { subtotalPaise: total + discount, discountPaise: discount, totalPaise: total },
    });

    let aliasPhrase: string | null = null;
    if (newSkuId !== line.skuId && line.originalText) {
      const key = parseSegment(line.originalText).productKey;
      if (key.length >= 3) {
        await tx.alias.upsert({
          where: { retailerId_phrase: { retailerId: order.retailerId, phrase: key } },
          create: { retailerId: order.retailerId, phrase: key, skuId: newSkuId },
          update: { skuId: newSkuId },
        });
        aliasPhrase = key;
      }
    }

    await tx.orderEvent.create({
      data: {
        orderId,
        actorId,
        action: "LINE_EDITED",
        note: aliasPhrase ? `Corrected a line; saved "${aliasPhrase}" as this retailer's word.` : "Corrected a line.",
      },
    });
    return { aliasPhrase };
  });
}
