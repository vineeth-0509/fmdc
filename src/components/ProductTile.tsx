"use client";

import Link from "next/link";
import { useCart } from "@/components/cart";
import { Stepper } from "@/components/controls";
import { useLang, useSkuName } from "@/components/lang";
import { ProductArt } from "@/components/ProductArt";
import { Chip, cx } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { schemeText } from "@/lib/scheme-text";
import type { CatalogueItem } from "@/server/catalogue";

const LOW_STOCK = 25;

export function ProductTile({ item, className }: { item: CatalogueItem; className?: string }) {
  const { t } = useLang();
  const skuName = useSkuName();
  const { qtyOf, setQty } = useCart();
  const qty = qtyOf(item.id);
  const out = item.stockCases <= 0;
  const scheme = schemeText(item.scheme, t);
  const name = skuName(item);

  return (
    <li className={cx("card flex flex-col overflow-hidden transition-shadow hover:shadow-md", className)}>
      <Link href={`/retailer/products/${item.id}`} className="block" aria-label={name}>
        <div className="relative">
          <ProductArt code={item.code} name={item.name} />
          {scheme && (
            <span className="absolute left-2 top-2 max-w-[85%] rounded-lg bg-turmeric px-2 py-1 text-[11px] font-bold leading-tight text-white shadow-sm">
              {scheme}
            </span>
          )}
          {out && (
            <div className="absolute inset-0 grid place-items-center bg-white/65">
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{t("outOfStock")}</span>
            </div>
          )}
        </div>
        <div className="px-3 pt-3">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[14px] font-semibold leading-snug">{name}</h3>
        </div>
      </Link>

      <div className="mt-auto px-3 pb-3 pt-1.5">
        <p className="text-lg font-bold leading-tight tabular-nums">
          {formatINR(item.casePricePaise)} <span className="text-xs font-medium text-ink-3">{t("perCase")}</span>
        </p>
        <p className="text-xs text-ink-3 tabular-nums">
          {formatINR(item.piecePricePaise)} {t("perPiece")}
        </p>
        <div className="mt-1.5 min-h-[22px]">
          {out ? null : item.stockCases <= LOW_STOCK ? (
            <Chip tone="turmeric">{t("lowStock", { n: item.stockCases })}</Chip>
          ) : (
            <Chip tone="pine">{t("inStock")}</Chip>
          )}
        </div>
        <div className="mt-2.5">
          {out ? (
            <button type="button" disabled className="btn btn-secondary btn-sm w-full">
              {t("outOfStock")}
            </button>
          ) : qty > 0 ? (
            <div className="flex justify-center">
              <Stepper value={qty} min={0} max={item.stockCases} onChange={(n) => setQty(item.id, n)} label={name} />
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-sm w-full" onClick={() => setQty(item.id, 1)}>
              {t("add")}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
