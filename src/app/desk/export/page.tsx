import { prisma } from "@/lib/db";
import { orderLabel } from "@/lib/format";
import { ExportPanel } from "@/components/ExportPanel";

export const metadata = { title: "Tally export" };

export default async function ExportPage() {
  const [confirmed, exportedCount] = await Promise.all([
    prisma.order.findMany({
      where: { status: "CONFIRMED" },
      orderBy: { seq: "asc" },
      include: { retailer: { select: { name: true } }, _count: { select: { lines: true } } },
    }),
    prisma.order.count({ where: { status: "EXPORTED" } }),
  ]);

  return (
    <ExportPanel
      exportedCount={exportedCount}
      orders={confirmed.map((o) => ({
        id: o.id,
        label: orderLabel(o.seq),
        retailerName: o.retailer.name,
        lineCount: o._count.lines,
        totalPaise: o.totalPaise,
      }))}
    />
  );
}
