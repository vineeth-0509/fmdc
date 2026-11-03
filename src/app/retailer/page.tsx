import { getSession } from "@/lib/auth/session";
import { getCatalogue } from "@/server/catalogue";
import { CatalogueView } from "@/components/CatalogueView";

export const metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const session = await getSession();
  const items = await getCatalogue(session!.retailerId as string);
  return <CatalogueView items={items} />;
}
