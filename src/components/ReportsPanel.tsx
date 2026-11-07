"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCheck, IconDownload, IconSearch, IconSheet } from "@/components/icons";
import { Button, EmptyState, ErrorNote, Notice, Skeleton, cx } from "@/components/ui";
import { fileNameFrom, saveBlob } from "@/lib/save-blob";
import { formatINR } from "@/lib/money";
import type { ReportPreview } from "@/lib/report-types";

type Shop = { id: string; name: string };
type Period = "1d" | "2d" | "7d" | "1m" | "3m" | "6m" | "custom";
type Format = "xlsx" | "csv";

const PERIODS: { key: Period; label: string }[] = [
  { key: "1d", label: "1 day" },
  { key: "2d", label: "2 days" },
  { key: "7d", label: "7 days" },
  { key: "1m", label: "1 month" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
  { key: "custom", label: "Custom dates" },
];

const STATUS_OPTIONS = [
  { id: "confirmed", label: "Confirmed", statuses: ["CONFIRMED"] },
  { id: "exported", label: "Exported to Tally", statuses: ["EXPORTED"] },
  { id: "waiting", label: "Awaiting review", statuses: ["PLACED", "CREDIT_HOLD"] },
  { id: "rejected", label: "Rejected", statuses: ["REJECTED"] },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pine text-sm font-bold text-white">{n}</span>
      <div>
        <h2 className="text-base font-bold leading-7">{title}</h2>
        {hint && <p className="text-sm text-ink-3">{hint}</p>}
      </div>
    </div>
  );
}

export function ReportsPanel({ shops }: { shops: Shop[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusIds, setStatusIds] = useState<Set<string>>(new Set(["confirmed", "exported"]));

  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const [busy, setBusy] = useState<Format | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; rows: number } | null>(null);
  const seq = useRef(0);

  const statuses = useMemo(
    () => STATUS_OPTIONS.filter((o) => statusIds.has(o.id)).flatMap((o) => o.statuses),
    [statusIds],
  );
  const ready = selected.size > 0 && statuses.length > 0 && (period !== "custom" || (from !== "" && to !== "" && from <= to));

  function query(format: "preview" | Format): string {
    const sp = new URLSearchParams({
      shops: selected.size === shops.length ? "all" : [...selected].join(","),
      period,
      statuses: statuses.join(","),
      format,
    });
    if (period === "custom") {
      sp.set("from", from);
      sp.set("to", to);
    }
    return sp.toString();
  }

  // Live preview: what will be in the file, before downloading.
  useEffect(() => {
    setDone(null);
    setDownloadError(null);
    if (!ready) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    const mine = ++seq.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await fetch(`/api/desk/reports?${query("preview")}`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error?.message ?? "Could not load the preview.");
        if (mine === seq.current) setPreview(data as ReportPreview);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (mine === seq.current) {
          setPreview(null);
          setPreviewError(e instanceof Error ? e.message : "Could not load the preview.");
        }
      } finally {
        if (mine === seq.current) setPreviewLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // query() reads the same values listed here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selected, period, from, to, statusIds, retry]);

  async function download(format: Format) {
    setBusy(format);
    setDownloadError(null);
    setDone(null);
    try {
      const res = await fetch(`/api/desk/reports?${query(format)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "The download failed. Please try again.");
      }
      const name = fileNameFrom(res, `orders.${format}`);
      const rows = Number(res.headers.get("x-report-rows") ?? 0);
      saveBlob(await res.blob(), name);
      setDone({ name, rows });
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "The download failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const shownShops = shops.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()));
  const allSelected = selected.size === shops.length && shops.length > 0;
  const hasData = !!preview && preview.orders > 0;
  const canDownload = ready && hasData && !previewLoading && busy === null;
  const toggle = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const blockedReason = !selected.size
    ? "Choose at least one shop."
    : !statuses.length
      ? "Choose at least one order status."
      : period === "custom" && (!from || !to || from > to)
        ? "Choose a valid start and end date."
        : previewLoading
          ? "Checking your selection…"
          : preview && preview.orders === 0
            ? "No orders match these choices."
            : null;

  const maxShopTotal = Math.max(1, ...(preview?.shops.map((s) => s.totalPaise) ?? [1]));

  return (
    <div className="mx-auto max-w-6xl pb-28 lg:pb-0">
      <h1 className="text-xl font-semibold">Reports</h1>
      <p className="mt-1 text-sm text-ink-2">
        Download the orders of one or more shops for a period, as a sheet. Reports only read data: they never change an order.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_390px]">
        <div className="space-y-5">
          <section className="card p-4">
            <StepTitle n={1} title="Choose shops" hint="Pick one shop or many. Orders of all chosen shops go into one file." />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
                <input
                  className="field min-h-[44px] pl-10"
                  placeholder="Search shops"
                  aria-label="Search shops"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button small variant="secondary" onClick={() => setSelected(new Set(shops.map((s) => s.id)))} disabled={allSelected}>
                Select all
              </Button>
              <Button small variant="ghost" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
                Clear
              </Button>
            </div>
            <p className="mt-2 text-sm font-semibold text-pine">
              {selected.size} of {shops.length} shops selected
            </p>
            <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line" role="group" aria-label="Shops">
              {shownShops.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-ink-3">No shop matches your search.</li>
              ) : (
                shownShops.map((s) => (
                  <li key={s.id}>
                    <label className={cx("flex min-h-[48px] cursor-pointer items-center gap-3 px-4 py-2", selected.has(s.id) && "bg-pine-soft/60")}>
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-pine"
                        checked={selected.has(s.id)}
                        onChange={() => setSelected((cur) => toggle(cur, s.id))}
                      />
                      <span className="text-[15px] font-medium">{s.name}</span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="card p-4">
            <StepTitle n={2} title="Choose the period" hint="Counted back from now." />
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Period">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={period === p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cx(
                    "min-h-[42px] rounded-full border px-4 text-sm font-semibold transition-colors",
                    period === p.key ? "border-pine bg-pine text-white" : "border-line-strong bg-white text-ink-2 hover:bg-pine-soft",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  From
                  <input type="date" className="field mt-1" max={todayIso()} value={from} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="text-sm font-semibold">
                  To
                  <input type="date" className="field mt-1" max={todayIso()} value={to} onChange={(e) => setTo(e.target.value)} />
                </label>
                {from && to && from > to && <p className="text-sm text-chilli sm:col-span-2">The start date must be before the end date.</p>}
              </div>
            )}
          </section>

          <section className="card p-4">
            <StepTitle n={3} title="Which orders?" hint="Confirmed and exported orders are included by default." />
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((o) => {
                const on = statusIds.has(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStatusIds((cur) => toggle(cur, o.id))}
                    className={cx(
                      "inline-flex min-h-[42px] items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                      on ? "border-pine bg-pine-soft text-pine" : "border-line-strong bg-white text-ink-2 hover:bg-black/5",
                    )}
                  >
                    {on && <IconCheck width={16} height={16} />}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-32">
          <section className="card p-4" aria-live="polite">
            <h2 className="text-base font-bold">Your report</h2>
            {!ready ? (
              <p className="mt-2 text-sm text-ink-3">{blockedReason ?? "Choose shops and a period to see what will be in your file."}</p>
            ) : previewLoading && !preview ? (
              <div className="mt-3 space-y-2" aria-busy="true">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : previewError ? (
              <div className="mt-3">
                <ErrorNote message={previewError} onRetry={() => setRetry((n) => n + 1)} />
              </div>
            ) : preview && preview.orders === 0 ? (
              <EmptyState icon={<IconSheet />} title="No orders match" body="Try a longer period, more shops or more order statuses." />
            ) : preview ? (
              <div className={cx(previewLoading && "opacity-60 transition-opacity")}>
                <p className="mt-1 text-sm text-ink-2">{preview.rangeLabel}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["Orders", preview.orders.toLocaleString("en-IN")],
                    ["Order lines", preview.lines.toLocaleString("en-IN")],
                    ["Cases", `${preview.cases.toLocaleString("en-IN")}${preview.freeCases ? ` + ${preview.freeCases.toLocaleString("en-IN")} free` : ""}`],
                    ["Total (excl. GST)", formatINR(preview.totalPaise)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-paper p-3">
                      <dt className="text-xs text-ink-3">{k}</dt>
                      <dd className="mt-0.5 text-base font-bold tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-xs font-semibold text-ink-3">BY SHOP</p>
                <ul className="mt-1 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                  {preview.shops.map((s) => (
                    <li key={s.id}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{s.name}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{formatINR(s.totalPaise)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/5">
                          <div className="h-full rounded-full bg-pine" style={{ width: `${Math.max(4, Math.round((s.totalPaise / maxShopTotal) * 100))}%` }} />
                        </div>
                        <span className="text-xs text-ink-3">{s.orders} order{s.orders === 1 ? "" : "s"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="card p-4">
            <h2 className="text-base font-bold">Download</h2>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => download("xlsx")}
                disabled={!canDownload}
                className="btn btn-primary h-auto min-h-[64px] justify-start gap-3 px-4 py-3 text-left"
              >
                <IconDownload className="shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold">{busy === "xlsx" ? "Preparing your Excel file…" : "Download Excel (.xlsx)"}</span>
                  <span className="block text-xs font-medium text-white/80">Summary, all orders and a tab for each shop</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => download("csv")}
                disabled={!canDownload}
                className="btn btn-secondary h-auto min-h-[56px] justify-start gap-3 px-4 py-3 text-left"
              >
                <IconSheet className="shrink-0 text-pine" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold">{busy === "csv" ? "Preparing your CSV file…" : "Download CSV"}</span>
                  <span className="block text-xs font-medium text-ink-3">One sheet that opens in Excel, Google Sheets and Tally tools</span>
                </span>
              </button>
            </div>
            {!canDownload && blockedReason && busy === null && <p className="mt-3 text-sm text-ink-3">{blockedReason}</p>}
            {downloadError && (
              <div className="mt-3">
                <ErrorNote message={downloadError} />
              </div>
            )}
            {done && (
              <div className="mt-3">
                <Notice tone="pine">
                  <span className="flex items-start gap-2">
                    <IconCheck className="mt-0.5 shrink-0" width={18} height={18} />
                    <span className="min-w-0 break-words">
                      <strong>Downloaded</strong> {done.name}
                      <span className="block text-xs">{done.rows.toLocaleString("en-IN")} rows. Check your Downloads folder.</span>
                    </span>
                  </span>
                </Notice>
              </div>
            )}
            <p className="mt-3 text-xs text-ink-3">Amounts are in rupees and exclude GST. Downloading does not change any order.</p>
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 py-3 pb-safe shadow-bar lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <p className="min-w-0 flex-1 text-sm">
            {hasData ? (
              <>
                <span className="block font-bold tabular-nums">{preview!.orders} orders</span>
                <span className="block text-xs text-ink-3 tabular-nums">{formatINR(preview!.totalPaise)}</span>
              </>
            ) : (
              <span className="text-ink-3">{blockedReason ?? "Choose shops and a period"}</span>
            )}
          </p>
          <Button onClick={() => download("xlsx")} disabled={!canDownload} loading={busy === "xlsx"}>
            <IconDownload width={18} height={18} /> Excel
          </Button>
        </div>
      </div>
    </div>
  );
}
