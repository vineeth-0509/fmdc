"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart";
import { Stepper } from "@/components/controls";
import { IconArrow, IconSearch } from "@/components/icons";
import { useLang, useSkuName } from "@/components/lang";
import { ProductArt } from "@/components/ProductArt";
import { Chip, EmptyState, cx } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { schemeText } from "@/lib/scheme-text";
import type { CatalogueItem } from "@/server/catalogue";

const LOW_STOCK = 25;

function ProductCard({ item }: { item: CatalogueItem }) {
  const { t } = useLang();
  const skuName = useSkuName();
  const { qtyOf, setQty } = useCart();
  const qty = qtyOf(item.id);
  const out = item.stockCases <= 0;
  const scheme = schemeText(item.scheme, t);

  return (
    <li className={cx("card flex gap-3 p-3", out && "opacity-80")}>
      <ProductArt code={item.code} size={92} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[15px] font-semibold leading-snug">{skuName(item)}</h3>
        <p className="mt-0.5 text-xs text-ink-3">{t("piecesInCase", { n: item.piecesPerCase })}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {out ? (
            <Chip tone="chilli">{t("outOfStock")}</Chip>
          ) : item.stockCases <= LOW_STOCK ? (
            <Chip tone="turmeric">{t("lowStock", { n: item.stockCases })}</Chip>
          ) : (
            <Chip tone="pine">{t("inStock")}</Chip>
          )}
          {scheme && <Chip tone="turmeric">{scheme}</Chip>}
        </div>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="leading-tight">
            <p className="text-lg font-bold tabular-nums">
              {formatINR(item.casePricePaise)} <span className="text-xs font-medium text-ink-3">{t("perCase")}</span>
            </p>
            <p className="text-xs text-ink-3 tabular-nums">
              {formatINR(item.piecePricePaise)} {t("perPiece")}
            </p>
          </div>
          {out ? null : qty > 0 ? (
            <Stepper value={qty} min={0} max={item.stockCases} onChange={(n) => setQty(item.id, n)} label={skuName(item)} />
          ) : (
            <button type="button" className="btn btn-primary btn-sm min-w-[84px]" onClick={() => setQty(item.id, 1)}>
              {t("add")}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function CatalogueView({ items }: { items: CatalogueItem[] }) {
  const { t } = useLang();
  const skuName = useSkuName();
  const { count } = useCart();
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.name} ${i.nameHi ?? ""} ${skuName(i)}`.toLowerCase().includes(q));
    // skuName changes with language, so it is a dependency through t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, t]);

  return (
    <div>
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          className="field pl-11"
          type="search"
          inputMode="search"
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="mt-2 px-1 text-xs text-ink-3">{t("exclGst")}</p>

      {shown.length === 0 ? (
        <EmptyState icon={<IconSearch />} title={t("noResults")} />
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {shown.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </ul>
      )}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(58px_+_env(safe-area-inset-bottom,0px))] z-20 px-4 md:bottom-6">
          <Link
            href="/retailer/cart"
            className="btn btn-primary mx-auto flex max-w-md justify-between shadow-bar"
          >
            <span>{t("itemsInCart", { n: count })}</span>
            <span className="inline-flex items-center gap-2">
              {t("viewCart")} <IconArrow width={18} height={18} />
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
