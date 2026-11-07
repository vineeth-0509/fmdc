"use client";

import Link from "next/link";
import { useState } from "react";
import { CartBar } from "@/components/CartBar";
import { useCart } from "@/components/cart";
import { Stepper } from "@/components/controls";
import { IconCheck } from "@/components/icons";
import { useLang, useSkuName } from "@/components/lang";
import { ProductArt } from "@/components/ProductArt";
import { ProductTile } from "@/components/ProductTile";
import { Button, Chip } from "@/components/ui";
import { CATEGORY_KEY, categoryOf, packInfo } from "@/lib/category";
import type { DictKey } from "@/lib/i18n";
import { formatINR } from "@/lib/money";
import { schemeText } from "@/lib/scheme-text";
import type { CatalogueItem } from "@/server/catalogue";
import type { SchemeTier } from "@/server/product";

type Section = { titleKey: DictKey; items: CatalogueItem[] };

const LOW_STOCK = 25;

export function ProductDetail({ item, tiers, sections }: { item: CatalogueItem; tiers: SchemeTier[]; sections: Section[] }) {
  const { t } = useLang();
  const skuName = useSkuName();
  const { qtyOf, setQty } = useCart();
  const inCart = qtyOf(item.id);
  const [qty, setLocalQty] = useState(1);

  const out = item.stockCases <= 0;
  const scheme = schemeText(item.scheme, t);
  const cat = categoryOf(item.code);
  const info = packInfo(item.name);
  const name = skuName(item);
  const pct = item.scheme?.type === "SLAB_PERCENT" ? item.scheme.percentBp / 100 : 0;

  const rows: [string, string][] = [
    [t("category"), t(CATEGORY_KEY[cat])],
    [t("packSize"), info.weight || "—"],
    [t("piecesPerCaseLabel"), String(item.piecesPerCase)],
    [t("pricePerCase"), formatINR(item.casePricePaise)],
    [t("pricePerPieceLabel"), formatINR(item.piecePricePaise)],
    [t("availability"), out ? t("outOfStock") : t("casesAvailable", { n: item.stockCases })],
    [t("skuCode"), item.code],
  ];

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-ink-3" aria-label="Breadcrumb">
        <Link href="/retailer" className="font-semibold text-pine hover:underline">
          {t("backCatalogue")}
        </Link>
        <span aria-hidden>›</span>
        <span>{t(CATEGORY_KEY[cat])}</span>
      </nav>

      <div className="grid gap-5 md:grid-cols-2 md:gap-8">
        <div className="relative overflow-hidden rounded-3xl border border-line shadow-soft">
          <ProductArt code={item.code} name={item.name} />
          {scheme && (
            <span className="absolute left-3 top-3 rounded-lg bg-turmeric px-2.5 py-1.5 text-xs font-bold text-white shadow-sm">{scheme}</span>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="neutral">{t(CATEGORY_KEY[cat])}</Chip>
            {out ? (
              <Chip tone="chilli">{t("outOfStock")}</Chip>
            ) : item.stockCases <= LOW_STOCK ? (
              <Chip tone="turmeric">{t("lowStock", { n: item.stockCases })}</Chip>
            ) : (
              <Chip tone="pine">{t("inStock")}</Chip>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight">{name}</h1>
          <p className="mt-1 text-sm text-ink-3">{t("piecesInCase", { n: item.piecesPerCase })}</p>

          <div className="card mt-4 p-4">
            <p className="text-3xl font-bold tabular-nums">
              {formatINR(item.casePricePaise)} <span className="text-base font-medium text-ink-3">{t("perCase")}</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-2 tabular-nums">
              {formatINR(item.piecePricePaise)} {t("perPiece")}
            </p>
            <p className="mt-1 text-xs text-ink-3">{t("exclGst")}</p>

            <div className="mt-4">
              {out ? (
                <Button variant="secondary" disabled className="w-full">
                  {t("outOfStock")}
                </Button>
              ) : inCart > 0 ? (
                <div className="space-y-3">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-pine">
                    <IconCheck width={18} height={18} /> {t("inCart")}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Stepper value={inCart} min={0} max={item.stockCases} onChange={(n) => setQty(item.id, n)} label={name} />
                    <Link href="/retailer/cart" className="btn btn-primary flex-1">
                      {t("goToCart")}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Stepper value={qty} min={1} max={item.stockCases} onChange={setLocalQty} label={name} />
                  <Button className="flex-1" onClick={() => setQty(item.id, qty)}>
                    {t("addToCartBtn")}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {scheme && tiers.length > 0 && (
            <div className="card mt-4 overflow-hidden border-turmeric/30">
              <div className="bg-turmeric-soft px-4 py-3">
                <p className="text-sm font-bold text-amber">{t("schemeHow")}</p>
                <p className="text-sm text-amber">{scheme}</p>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="text-ink-3">
                  <tr>
                    <th className="px-4 py-2 font-semibold">{t("colOrder")}</th>
                    <th className="px-4 py-2 font-semibold">{t("colPay")}</th>
                    <th className="px-4 py-2 font-semibold">{t("colGet")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {tiers.map((tier) => (
                    <tr key={tier.qty}>
                      <td className="px-4 py-2.5">{t("getCases", { n: tier.qty })}</td>
                      <td className="px-4 py-2.5 font-semibold">{formatINR(tier.payPaise)}</td>
                      <td className={tier.freeCases > 0 || tier.discountPaise > 0 ? "px-4 py-2.5 font-semibold text-turmeric" : "px-4 py-2.5"}>
                        {item.scheme?.type === "FREE_GOODS"
                          ? tier.freeCases > 0
                            ? t("getCasesFree", { n: tier.getCases, f: tier.freeCases })
                            : t("getCases", { n: tier.getCases })
                          : tier.discountPaise > 0
                            ? t("slabOff", { pct })
                            : t("noDiscount")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <section className="card mt-6 overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 text-base font-bold">{t("productDetails")}</h2>
        <dl className="divide-y divide-line text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[1fr_1.4fr] gap-3 px-4 py-2.5">
              <dt className="text-ink-2">{k}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {sections.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">{t("recTitle")}</h2>
          {sections.map((s) => (
            <div key={s.titleKey} className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-ink-2">{t(s.titleKey)}</h3>
              <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3">
                {s.items.map((rec) => (
                  <ProductTile key={rec.id} item={rec} className="w-[172px] shrink-0 snap-start" />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <CartBar />
    </div>
  );
}
