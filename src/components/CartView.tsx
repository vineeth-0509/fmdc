"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart";
import { Stepper } from "@/components/controls";
import { IconAlert, IconBag } from "@/components/icons";
import { useLang, useSkuName } from "@/components/lang";
import { ProductArt } from "@/components/ProductArt";
import { Button, EmptyState, ErrorNote, Notice, Skeleton, btnClass } from "@/components/ui";
import { formatINR } from "@/lib/money";
import type { CartPreview } from "@/server/orders";

export function CartView() {
  const router = useRouter();
  const { t } = useLang();
  const skuName = useSkuName();
  const { items, captureId, ready, setQty, clear } = useCart();
  const [preview, setPreview] = useState<CartPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    if (items.length === 0) {
      setPreview(null);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/orders/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: items.map((i) => ({ skuId: i.skuId, qtyCases: i.qty, originalText: i.originalText ?? null })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not price your cart.");
      if (mine === seq.current) setPreview(data as CartPreview);
    } catch (e) {
      if (mine === seq.current) setLoadError(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [items, t]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(refresh, 250);
    return () => clearTimeout(timer);
  }, [ready, refresh]);

  async function place() {
    setPlacing(true);
    setPlaceError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: items.map((i) => ({ skuId: i.skuId, qtyCases: i.qty, originalText: i.originalText ?? null })),
          captureId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not place the order.");
      clear();
      router.push(`/retailer/orders/${data.id}?placed=1`);
    } catch (e) {
      setPlaceError(e instanceof Error ? e.message : "Could not place the order.");
      setPlacing(false);
      refresh();
    }
  }

  if (!ready) return <Skeleton className="h-40 w-full" />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<IconBag />}
        title={t("cartEmptyTitle")}
        body={t("cartEmptyBody")}
        action={
          <Link href="/retailer" className={btnClass("primary")}>
            {t("browse")}
          </Link>
        }
      />
    );
  }

  const lineProblem = (p: NonNullable<CartPreview["lines"][number]["problem"]>, stock: number) =>
    p === "OUT_OF_STOCK" ? t("stockProblemOut") : p === "EXCEEDS_STOCK" ? t("stockProblemMax", { n: stock }) : t("unavailable");

  return (
    <div className="mx-auto max-w-2xl pb-28 md:pb-0">
      <h1 className="text-xl font-semibold">{t("cartTitle")}</h1>

      {loadError && (
        <div className="mt-3">
          <ErrorNote message={loadError} onRetry={refresh} retryLabel={t("tryAgain")} />
        </div>
      )}

      <ul className="mt-3 space-y-3">
        {items.map((item) => {
          const line = preview?.lines.find((l) => l.skuId === item.skuId);
          return (
            <li key={item.skuId} className="card p-3">
              <div className="flex gap-3">
                <ProductArt code={line?.code ?? ""} name={line?.name} size={64} />
                <div className="min-w-0 flex-1">
                  {line ? (
                    <>
                      <p className="text-[15px] font-semibold leading-snug">{skuName(line)}</p>
                      {line.freeCases > 0 && (
                        <p className="mt-0.5 text-sm font-semibold text-turmeric">{t("freeCases", { n: line.freeCases })} {t("cases")}</p>
                      )}
                    </>
                  ) : (
                    <Skeleton className="h-5 w-40" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setQty(item.skuId, 0)}
                  className="self-start rounded-lg px-2 py-2 text-sm font-semibold text-ink-3 hover:bg-black/5"
                >
                  {t("remove")}
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <Stepper value={item.qty} min={1} max={9999} onChange={(n) => setQty(item.skuId, n)} label={line ? skuName(line) : "Quantity"} />
                <div className="text-right leading-tight">
                  {line && line.discountPaise > 0 && (
                    <p className="text-xs text-ink-3 line-through tabular-nums">{formatINR(line.grossPaise)}</p>
                  )}
                  <p className="text-base font-bold tabular-nums">{line ? formatINR(line.lineTotalPaise) : "—"}</p>
                </div>
              </div>

              {line?.problem && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-chilli-soft px-3 py-2 text-sm text-chilli">
                  <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
                  {lineProblem(line.problem, line.stockCases)}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="card mt-4 p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-2">{t("subtotal")}</dt>
            <dd className="tabular-nums">{preview ? formatINR(preview.subtotalPaise) : "—"}</dd>
          </div>
          {preview && preview.discountPaise > 0 && (
            <div className="flex justify-between text-turmeric">
              <dt>{t("schemeDiscount")}</dt>
              <dd className="tabular-nums">−{formatINR(preview.discountPaise)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-line pt-3 text-lg font-bold">
            <dt>{t("total")}</dt>
            <dd className="tabular-nums">{preview ? formatINR(preview.totalPaise) : "—"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-3">{t("gstNote")}</p>
      </div>

      {preview?.creditHold && (
        <div className="mt-3">
          <Notice>{t("creditHoldNote")}</Notice>
        </div>
      )}
      {placeError && (
        <div className="mt-3">
          <ErrorNote message={placeError} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[calc(58px_+_env(safe-area-inset-bottom,0px))] z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
        <Button
          className="mx-auto flex w-full max-w-2xl"
          onClick={place}
          loading={placing}
          disabled={!preview || !preview.canPlace || loading}
        >
          {placing ? t("placing") : `${t("placeOrder")}${preview ? ` · ${formatINR(preview.totalPaise)}` : ""}`}
        </Button>
      </div>
    </div>
  );
}
