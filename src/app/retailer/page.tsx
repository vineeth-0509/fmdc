import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { getCatalogue } from "@/server/catalogue";
import { CatalogueView } from "@/components/CatalogueView";

export const metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const session = await getSession();
  const retailerId = session!.retailerId as string;
  const [items, retailer] = await Promise.all([
    getCatalogue(retailerId),
    prisma.retailer.findUnique({ where: { id: retailerId }, select: { name: true } }),
  ]);
  return <CatalogueView items={items} retailerName={retailer?.name ?? ""} />;
}
