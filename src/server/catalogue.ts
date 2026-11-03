import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Scheme } from "@/server/schemes/engine";
import type { SkuForPricing } from "@/server/pricing";

export type CatalogueItem = {
  id: string;
  code: string;
  name: string;
  nameHi: string | null;
  piecesPerCase: number;
  stockCases: number;
  piecePricePaise: number;
  casePricePaise: number;
  scheme: Scheme | null;
};

type SchemeRow = {
  type: "FREE_GOODS" | "SLAB_PERCENT";
  buyCases: number | null;
  freeCases: number | null;
  minCases: number | null;
  percentBp: number | null;
};

export function toScheme(row: SchemeRow | undefined): Scheme | null {
  if (!row) return null;
  if (row.type === "FREE_GOODS" && row.buyCases && row.freeCases) {
    return { type: "FREE_GOODS", buyCases: row.buyCases, freeCases: row.freeCases };
  }
  if (row.type === "SLAB_PERCENT" && row.minCases && row.percentBp !== null) {
    return { type: "SLAB_PERCENT", minCases: row.minCases, percentBp: row.percentBp };
  }
  return null;
}

/** Only SKUs this retailer has a price for are returned, so one retailer never sees another's list. */
export async function getCatalogue(retailerId: string): Promise<CatalogueItem[]> {
  const rows = await prisma.retailerPrice.findMany({
    where: { retailerId, sku: { active: true } },
    include: { sku: { include: { schemes: { where: { active: true }, take: 1 } } } },
    orderBy: { sku: { code: "asc" } },
  });
  return rows.map((r) => ({
    id: r.sku.id,
    code: r.sku.code,
    name: r.sku.name,
    nameHi: r.sku.nameHi,
    piecesPerCase: r.sku.piecesPerCase,
    stockCases: r.sku.stockCases,
    piecePricePaise: r.piecePricePaise,
    casePricePaise: r.piecePricePaise * r.sku.piecesPerCase,
    scheme: toScheme(r.sku.schemes[0]),
  }));
}

/** Loads the data the pricing function needs, for one retailer and a set of SKU ids. */
export async function loadPricingData(
  db: Prisma.TransactionClient,
  retailerId: string,
  skuIds: string[],
): Promise<{ skus: Map<string, SkuForPricing>; prices: Map<string, number> }> {
  const [skuRows, priceRows] = await Promise.all([
    db.sku.findMany({
      where: { id: { in: skuIds } },
      include: { schemes: { where: { active: true }, take: 1 } },
    }),
    db.retailerPrice.findMany({ where: { retailerId, skuId: { in: skuIds } } }),
  ]);
  const skus = new Map<string, SkuForPricing>(
    skuRows.map((s) => [
      s.id,
      {
        id: s.id,
        code: s.code,
        name: s.name,
        nameHi: s.nameHi,
        piecesPerCase: s.piecesPerCase,
        stockCases: s.stockCases,
        active: s.active,
        scheme: toScheme(s.schemes[0]),
      },
    ]),
  );
  const prices = new Map(priceRows.map((p) => [p.skuId, p.piecePricePaise]));
  return { skus, prices };
}
