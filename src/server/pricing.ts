import { priceLine, type Scheme } from "@/server/schemes/engine";

export type SkuForPricing = {
  id: string;
  code: string;
  name: string;
  nameHi: string | null;
  piecesPerCase: number;
  stockCases: number;
  active: boolean;
  scheme: Scheme | null;
};

export type CartLineInput = {
  skuId: string;
  qtyCases: number;
  originalText?: string | null;
};

export type LineProblem = "OUT_OF_STOCK" | "EXCEEDS_STOCK" | "UNAVAILABLE";

export type PricedLine = {
  skuId: string;
  code: string;
  name: string;
  nameHi: string | null;
  qtyCases: number;
  freeCases: number;
  deliveredCases: number;
  piecePricePaise: number;
  grossPaise: number;
  discountPaise: number;
  lineTotalPaise: number;
  stockCases: number;
  problem: LineProblem | null;
  originalText: string | null;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
};

/** Same product added twice becomes one line, so schemes see the combined quantity. */
export function mergeLines(lines: CartLineInput[]): CartLineInput[] {
  const map = new Map<string, CartLineInput>();
  for (const l of lines) {
    const existing = map.get(l.skuId);
    if (existing) {
      existing.qtyCases += l.qtyCases;
      if (!existing.originalText && l.originalText) existing.originalText = l.originalText;
    } else {
      map.set(l.skuId, { skuId: l.skuId, qtyCases: l.qtyCases, originalText: l.originalText ?? null });
    }
  }
  return [...map.values()];
}

/**
 * Prices a cart from server-side data only. `prices` maps skuId to this retailer's
 * per-piece price in paise. Nothing here comes from the browser except skuId and quantity.
 */
export function priceCartLines(
  input: CartLineInput[],
  skus: Map<string, SkuForPricing>,
  prices: Map<string, number>,
): PricedCart {
  const lines: PricedLine[] = mergeLines(input).map((l) => {
    const sku = skus.get(l.skuId);
    const piecePricePaise = prices.get(l.skuId);
    if (!sku || !sku.active || piecePricePaise === undefined) {
      return {
        skuId: l.skuId,
        code: sku?.code ?? "",
        name: sku?.name ?? "Unavailable item",
        nameHi: sku?.nameHi ?? null,
        qtyCases: l.qtyCases,
        freeCases: 0,
        deliveredCases: l.qtyCases,
        piecePricePaise: 0,
        grossPaise: 0,
        discountPaise: 0,
        lineTotalPaise: 0,
        stockCases: sku?.stockCases ?? 0,
        problem: "UNAVAILABLE" as const,
        originalText: l.originalText ?? null,
      };
    }
    const r = priceLine({
      qtyCases: l.qtyCases,
      piecesPerCase: sku.piecesPerCase,
      piecePricePaise,
      scheme: sku.scheme,
    });
    let problem: LineProblem | null = null;
    if (sku.stockCases <= 0) problem = "OUT_OF_STOCK";
    else if (r.deliveredCases > sku.stockCases) problem = "EXCEEDS_STOCK";
    return {
      skuId: sku.id,
      code: sku.code,
      name: sku.name,
      nameHi: sku.nameHi,
      qtyCases: r.paidCases,
      freeCases: r.freeCases,
      deliveredCases: r.deliveredCases,
      piecePricePaise,
      grossPaise: r.grossPaise,
      discountPaise: r.discountPaise,
      lineTotalPaise: r.lineTotalPaise,
      stockCases: sku.stockCases,
      problem,
      originalText: l.originalText ?? null,
    };
  });

  const subtotalPaise = lines.reduce((s, l) => s + l.grossPaise, 0);
  const discountPaise = lines.reduce((s, l) => s + l.discountPaise, 0);
  return { lines, subtotalPaise, discountPaise, totalPaise: subtotalPaise - discountPaise };
}

/** Assumption A6: an order that would take outstanding above the limit waits for the desk. */
export function creditDecision(
  outstandingPaise: number,
  creditLimitPaise: number,
  orderTotalPaise: number,
): "OK" | "HOLD" {
  return outstandingPaise + orderTotalPaise > creditLimitPaise ? "HOLD" : "OK";
}
