"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CartBar } from "@/components/CartBar";
import { IconArrow, IconSearch, IconSpark } from "@/components/icons";
import { useLang, useSkuName } from "@/components/lang";
import { ProductTile } from "@/components/ProductTile";
import { EmptyState, cx } from "@/components/ui";
import { CATEGORY_KEY, categoryOf, type CategoryCode } from "@/lib/category";
import type { CatalogueItem } from "@/server/catalogue";

export function CatalogueView({ items, retailerName }: { items: CatalogueItem[]; retailerName: string }) {
  const { t } = useLang();
  const skuName = useSkuName();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CategoryCode | "ALL">("ALL");

  const categories = useMemo(() => {
    const seen = new Set<CategoryCode>();
    for (const i of items) seen.add(categoryOf(i.code));
    return [...seen];
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (cat !== "ALL" && categoryOf(i.code) !== cat) return false;
      if (!q) return true;
      return `${i.name} ${i.nameHi ?? ""} ${skuName(i)}`.toLowerCase().includes(q);
    });
    // skuName depends on the language, which changes t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, cat, t]);

  return (
    <div>
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-pine to-pine-dark p-5 text-white shadow-soft">
        <p className="text-sm text-white/75">{t("greeting")},</p>
        <h1 className="text-2xl font-bold leading-tight">{retailerName}</h1>
        <p className="mt-1 text-sm text-white/80">{t("heroSub")}</p>
        <div className="relative mt-4">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            className="field border-0 pl-11 shadow-sm"
            type="search"
            inputMode="search"
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      <Link
        href="/retailer/capture"
        className="card mt-3 flex items-center gap-3 border-turmeric/30 bg-gradient-to-r from-turmeric-soft to-white p-3.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-turmeric text-white">
          <IconSpark />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[15px] font-bold">
            {t("aiBannerTitle")}
            <span className="rounded bg-turmeric px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">AI</span>
          </span>
          <span className="block text-sm text-ink-2">{t("aiBannerBody")}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-pine">
          {t("aiBannerCta")} <IconArrow width={18} height={18} />
        </span>
      </Link>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Categories">
        {(["ALL", ...categories] as (CategoryCode | "ALL")[]).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={cx(
              "min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
              cat === c ? "border-pine bg-pine text-white" : "border-line-strong bg-white text-ink-2 hover:bg-pine-soft",
            )}
          >
            {c === "ALL" ? t("catAll") : t(CATEGORY_KEY[c])}
          </button>
        ))}
      </div>
      <p className="mt-2 px-1 text-xs text-ink-3">{t("exclGst")}</p>

      {shown.length === 0 ? (
        <EmptyState icon={<IconSearch />} title={t("noResults")} />
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((item) => (
            <ProductTile key={item.id} item={item} />
          ))}
        </ul>
      )}

      <CartBar />
    </div>
  );
}
