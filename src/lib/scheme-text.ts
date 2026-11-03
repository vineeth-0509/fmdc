import type { Scheme } from "@/server/schemes/engine";
import type { DictKey } from "@/lib/i18n";

type T = (key: DictKey, vars?: Record<string, string | number>) => string;

/** Display text only. The numbers that decide discounts come from the server. */
export function schemeText(s: Scheme | null, t: T): string | null {
  if (!s) return null;
  if (s.type === "FREE_GOODS") return t("schemeFree", { buy: s.buyCases, free: s.freeCases });
  return t("schemeSlab", { pct: s.percentBp / 100, min: s.minCases });
}
