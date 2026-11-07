import { priceLine, type Scheme } from "@/server/schemes/engine";

export type SchemeTier = {
  qty: number;
  payPaise: number;
  getCases: number;
  freeCases: number;
  discountPaise: number;
};

/** Worked examples for the product page. Every number comes from the scheme engine. */
export function schemeTiers(item: {
  piecesPerCase: number;
  piecePricePaise: number;
  scheme: Scheme | null;
}): SchemeTier[] {
  const s = item.scheme;
  if (!s) return [];
  const base = s.type === "FREE_GOODS" ? s.buyCases : s.minCases;
  const qtys = [...new Set([Math.max(1, base - 1), base, base * 2])];
  return qtys.map((qty) => {
    const r = priceLine({
      qtyCases: qty,
      piecesPerCase: item.piecesPerCase,
      piecePricePaise: item.piecePricePaise,
      scheme: s,
    });
    return { qty, payPaise: r.lineTotalPaise, getCases: r.deliveredCases, freeCases: r.freeCases, discountPaise: r.discountPaise };
  });
}

export type RecItem = { id: string; category: string; stockCases: number; hasScheme: boolean };
export type RecGroups = { otherSizes: string[]; often: string[]; onScheme: string[] };

/**
 * Simple, explainable recommendations (not AI):
 * 1. other sizes in the same category, 2. products this retailer already orders, 3. products on a scheme.
 * Only in-stock products from this retailer's own catalogue are used.
 */
export function recommend(
  currentId: string,
  items: RecItem[],
  orderCounts: Map<string, number>,
  perGroup = 4,
  total = 8,
): RecGroups {
  const current = items.find((i) => i.id === currentId);
  const pool = items.filter((i) => i.id !== currentId && i.stockCases > 0);
  const used = new Set<string>();
  const take = (list: RecItem[]) => {
    const ids: string[] = [];
    for (const i of list) {
      if (used.size >= total || ids.length >= perGroup) break;
      if (used.has(i.id)) continue;
      used.add(i.id);
      ids.push(i.id);
    }
    return ids;
  };

  const otherSizes = take(current ? pool.filter((i) => i.category === current.category) : []);
  const often = take(
    pool
      .filter((i) => (orderCounts.get(i.id) ?? 0) > 0)
      .sort((a, b) => (orderCounts.get(b.id) ?? 0) - (orderCounts.get(a.id) ?? 0)),
  );
  const onScheme = take(pool.filter((i) => i.hasScheme));
  return { otherSizes, often, onScheme };
}
