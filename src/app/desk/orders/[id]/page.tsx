import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { orderLabel } from "@/lib/format";
import { DeskOrderView, type DeskOrderData } from "@/components/DeskOrderView";

export const metadata = { title: "Review order" };

export default async function DeskOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      retailer: true,
      capture: { select: { rawText: true } },
      lines: { include: { sku: true }, orderBy: { id: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const prices = await prisma.retailerPrice.findMany({
    where: { retailerId: order.retailerId, sku: { active: true } },
    include: { sku: { select: { id: true, code: true, name: true } } },
    orderBy: { sku: { code: "asc" } },
  });

  const data: DeskOrderData = {
    id: order.id,
    label: orderLabel(order.seq),
    status: order.status,
    source: order.source,
    createdAt: order.createdAt.toISOString(),
    retailerName: order.retailer.name,
    creditLimitPaise: order.retailer.creditLimitPaise,
    outstandingPaise: order.retailer.outstandingPaise,
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    totalPaise: order.totalPaise,
    rawText: order.capture?.rawText ?? null,
    note: order.note,
    lines: order.lines.map((l) => ({
      id: l.id,
      skuId: l.skuId,
      code: l.sku.code,
      name: l.sku.name,
      qtyCases: l.qtyCases,
      freeCases: l.freeCases,
      discountPaise: l.discountPaise,
      lineTotalPaise: l.lineTotalPaise,
      originalText: l.originalText,
    })),
    events: order.events.map((e) => ({ id: e.id, action: e.action, note: e.note, createdAt: e.createdAt.toISOString() })),
    products: prices.map((p) => ({ id: p.sku.id, name: p.sku.name })),
  };

  return <DeskOrderView order={data} />;
}
