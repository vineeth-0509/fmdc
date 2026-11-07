import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { categoryOf } from "@/lib/category";
import { getCatalogue } from "@/server/catalogue";
import { recommend, schemeTiers } from "@/server/product";
import { ProductDetail } from "@/components/ProductDetail";

export const metadata = { title: "Product" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const retailerId = session!.retailerId as string;

  // Only products this retailer has a price for are in the list, so another retailer's catalogue is never exposed.
  const items = await getCatalogue(retailerId);
  const item = items.find((i) => i.id === id);
  if (!item) notFound();

  const counts = await prisma.orderLine.groupBy({
    by: ["skuId"],
    where: { order: { retailerId, status: { not: "REJECTED" } } },
    _count: { _all: true },
  });
  const orderCounts = new Map(counts.map((c) => [c.skuId, c._count._all]));

  const groups = recommend(
    item.id,
    items.map((i) => ({ id: i.id, category: categoryOf(i.code), stockCases: i.stockCases, hasScheme: i.scheme !== null })),
    orderCounts,
  );
  const byId = new Map(items.map((i) => [i.id, i]));
  const pick = (ids: string[]) => ids.map((x) => byId.get(x)).filter((x): x is NonNullable<typeof x> => Boolean(x));

  const sections = [
    { titleKey: "recOther" as const, items: pick(groups.otherSizes) },
    { titleKey: "recOften" as const, items: pick(groups.often) },
    { titleKey: "recScheme" as const, items: pick(groups.onScheme) },
  ].filter((s) => s.items.length > 0);

  return <ProductDetail item={item} tiers={schemeTiers(item)} sections={sections} />;
}
