"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart";
import { Stepper } from "@/components/controls";
import { IconAlert, IconCheck, IconSpark } from "@/components/icons";
import { useLang, useSkuName } from "@/components/lang";
import { ProductArt } from "@/components/ProductArt";
import { Button, Chip, ErrorNote, Notice, Skeleton, cx } from "@/components/ui";
import type { CaptureLine, CaptureResult, Confidence, SkuOption } from "@/lib/capture-types";
import type { DictKey } from "@/lib/i18n";

const SAMPLE = "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti";

type LineState = { chosenId: string | null; qty: number; unitOk: boolean; removed: boolean };

const CONF: Record<Confidence, { key: DictKey; tone: "pine" | "turmeric" | "chilli" | "neutral" }> = {
  HIGH: { key: "confHigh", tone: "pine" },
  MEDIUM: { key: "confMedium", tone: "turmeric" },
  LOW: { key: "confLow", tone: "chilli" },
  NONE: { key: "confNone", tone: "neutral" },
};

export function CaptureView({ catalogue }: { catalogue: SkuOption[] }) {
  const router = useRouter();
  const { t } = useLang();
  const skuName = useSkuName();
  const { addMany } = useCart();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [state, setState] = useState<Record<string, LineState>>({});

  const byId = new Map(catalogue.map((s) => [s.id, s]));

  async function read() {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/parse-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not read your message.");
      const r = data as CaptureResult;
      setResult(r);
      setState(
        Object.fromEntries(
          r.lines.map((l) => [
            l.id,
            { chosenId: l.chosen?.id ?? null, qty: l.quantity ?? 1, unitOk: !l.needsUnitConfirm, removed: false },
          ]),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read your message.");
    } finally {
      setLoading(false);
    }
  }

  const patch = (id: string, p: Partial<LineState>) => setState((s) => ({ ...s, [id]: { ...s[id], ...p } }));

  function blocked(line: CaptureLine): boolean {
    const st = state[line.id];
    if (!st || st.removed) return false;
    const sku = st.chosenId ? byId.get(st.chosenId) : undefined;
    return !sku || sku.stockCases <= 0 || !st.unitOk || st.qty < 1;
  }

  const active = result?.lines.filter((l) => !state[l.id]?.removed) ?? [];
  const blockedCount = active.filter(blocked).length;
  const canAdd = active.length > 0 && blockedCount === 0;

  function addToCart() {
    if (!result) return;
    addMany(
      active.map((l) => ({ skuId: state[l.id].chosenId as string, qty: state[l.id].qty, originalText: l.original })),
      result.captureId,
    );
    router.push("/retailer/cart");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">{t("captureTitle")}</h1>
      <p className="mt-1 text-sm text-ink-2">{t("captureHelp")}</p>

      <textarea
        className="field mt-4 min-h-[132px] py-3 leading-relaxed"
        placeholder={t("capturePlaceholder")}
        aria-label={t("captureTitle")}
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={read} loading={loading} disabled={text.trim().length < 2} className="flex-1 sm:flex-none">
          <IconSpark width={18} height={18} />
          {loading ? t("captureReading") : t("captureRead")}
        </Button>
        <Button variant="secondary" onClick={() => setText(SAMPLE)} disabled={loading}>
          {t("captureSample")}
        </Button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote message={error} onRetry={read} retryLabel={t("tryAgain")} />
        </div>
      )}

      {loading && (
        <div className="mt-5 space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      )}

      {result && (
        <section className="mt-6">
          {result.notice && <Notice>{result.notice}</Notice>}
          <p className="mt-3 text-sm text-ink-2">{t("reviewNote")}</p>

          <ul className="mt-3 space-y-3">
            {result.lines.map((line) => {
              const st = state[line.id];
              if (!st || st.removed) return null;
              const sku = st.chosenId ? byId.get(st.chosenId) : undefined;
              const out = sku ? sku.stockCases <= 0 : false;
              const conf = CONF[line.confidence];
              const options: SkuOption[] = [line.chosen, ...line.alternatives].filter((s): s is SkuOption => Boolean(s));
              const suggested = line.suggestedCases && sku ? line.suggestedCases : null;

              return (
                <li key={line.id} className={cx("card p-3", blocked(line) && "border-turmeric/50")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-3">{t("yourWords")}</p>
                      <p className="mt-0.5 break-words text-[15px] font-medium">&ldquo;{line.original}&rdquo;</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => patch(line.id, { removed: true })}
                      className="shrink-0 rounded-lg px-2 py-2 text-sm font-semibold text-ink-3 hover:bg-black/5"
                    >
                      {t("remove")}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-paper p-2.5">
                    {sku ? <ProductArt code={sku.code} size={52} /> : <div className="h-[52px] w-[52px] rounded-2xl bg-black/5" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ink-3">{t("matchedTo")}</p>
                      <p className="text-[15px] font-semibold leading-snug">{sku ? skuName(sku) : t("pickProduct")}</p>
                    </div>
                    <Chip tone={conf.tone}>{t(conf.key)}</Chip>
                  </div>

                  {line.note && <p className="mt-2 text-sm text-amber">{line.note}</p>}

                  {options.length > 1 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-ink-3">{t("otherChoices")}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {options.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => patch(line.id, { chosenId: o.id })}
                            aria-pressed={st.chosenId === o.id}
                            className={cx(
                              "min-h-[40px] rounded-xl border px-3 text-left text-sm",
                              st.chosenId === o.id ? "border-pine bg-pine-soft font-semibold text-pine" : "border-line-strong bg-white",
                            )}
                          >
                            {skuName(o)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <select
                    className="field mt-3"
                    aria-label={t("pickProduct")}
                    value={st.chosenId ?? ""}
                    onChange={(e) => patch(line.id, { chosenId: e.target.value || null })}
                  >
                    <option value="">{t("pickProduct")}</option>
                    {catalogue.map((c) => (
                      <option key={c.id} value={c.id}>
                        {skuName(c)}
                      </option>
                    ))}
                  </select>

                  {out && (
                    <p className="mt-3 flex items-start gap-2 rounded-lg bg-chilli-soft px-3 py-2 text-sm text-chilli">
                      <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
                      {t("lineOut")}
                    </p>
                  )}

                  {!out && (
                    <div className="mt-3">
                      {st.unitOk ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Stepper value={st.qty} min={1} max={sku ? Math.max(1, sku.stockCases) : 9999} onChange={(n) => patch(line.id, { qty: n })} label={t("cases")} />
                          {line.needsUnitConfirm && (
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-pine">
                              <IconCheck width={18} height={18} /> {t("unitConfirmed")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-turmeric/40 bg-turmeric-soft p-3">
                          <p className="text-sm font-semibold text-amber">{t("unitQuestion")}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Stepper value={st.qty} min={1} max={9999} onChange={(n) => patch(line.id, { qty: n })} label={t("cases")} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button small onClick={() => patch(line.id, { unitOk: true })}>
                              {t("yesCases", { n: st.qty })}
                            </Button>
                            {suggested && sku && (
                              <Button
                                small
                                variant="secondary"
                                onClick={() => patch(line.id, { unitOk: true, qty: suggested })}
                              >
                                {t("yesSuggested", { n: suggested, p: suggested * sku.piecesPerCase })}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4">
            <Button className="w-full" onClick={addToCart} disabled={!canAdd}>
              {active.length === 0 ? t("nothingToAdd") : canAdd ? t("addToCart", { n: active.length }) : t("fixLines")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
