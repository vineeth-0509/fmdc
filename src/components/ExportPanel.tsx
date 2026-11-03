"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconDownload } from "@/components/icons";
import { Button, EmptyState, ErrorNote, Notice } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { TALLY_HEADER } from "@/server/export/tally";

type Row = { id: string; label: string; retailerName: string; lineCount: number; totalPaise: number };

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportPanel({ orders, exportedCount }: { orders: Row[]; exportedCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const total = orders.reduce((s, o) => s + o.totalPaise, 0);

  async function exportNow() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/desk/export", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Export failed. Nothing was marked as exported.");
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "tally-export.csv";
      saveBlob(await res.blob(), name);
      setDone(`${orders.length} order${orders.length === 1 ? "" : "s"} exported to ${name}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">Export to Tally</h1>
      <p className="mt-1 text-sm text-ink-2">
        Confirmed orders are exported once, then marked as exported so they are not sent twice.
      </p>

      {done && (
        <div className="mt-4">
          <Notice tone="pine">{done}</Notice>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <ErrorNote message={error} />
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={<IconDownload />}
          title="No confirmed orders to export"
          body="Confirm orders from the Orders tab and they will be listed here."
        />
      ) : (
        <>
          <ul className="card mt-4 divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold tabular-nums">{o.label}</p>
                  <p className="text-sm text-ink-2">
                    {o.retailerName} · {o.lineCount} line{o.lineCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="font-semibold tabular-nums">{formatINR(o.totalPaise)}</p>
              </li>
            ))}
            <li className="flex items-center justify-between p-4 text-lg font-bold">
              <span>{orders.length} orders</span>
              <span className="tabular-nums">{formatINR(total)}</span>
            </li>
          </ul>
          <Button className="mt-4 w-full sm:w-auto" onClick={exportNow} loading={busy}>
            <IconDownload width={18} height={18} />
            Export {orders.length} order{orders.length === 1 ? "" : "s"} to CSV
          </Button>
        </>
      )}

      {exportedCount > 0 && (
        <p className="mt-6 text-sm text-ink-2">
          {exportedCount} order{exportedCount === 1 ? " was" : "s were"} exported earlier.{" "}
          <a className="font-semibold text-pine underline underline-offset-2" href="/api/desk/export?status=EXPORTED">
            Download them again
          </a>
        </p>
      )}

      <details className="card mt-6 p-4 text-sm">
        <summary className="cursor-pointer font-semibold">CSV columns</summary>
        <p className="mt-2 text-ink-2">
          One row per order line. The brief gives no Tally import layout, so this column order is our own choice.
        </p>
        <p className="mt-2 break-words font-mono text-xs text-ink-2">{TALLY_HEADER.join(" | ")}</p>
      </details>
    </div>
  );
}
