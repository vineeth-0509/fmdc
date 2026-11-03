"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { Stepper } from "@/components/controls";
import { IconAlert, IconCheck } from "@/components/icons";
import { ProductArt } from "@/components/ProductArt";
import { Button, Chip, ErrorNote, Notice, StatusChip, cx } from "@/components/ui";
import { STATUS_LABEL, formatDateTime } from "@/lib/format";
import { formatINR } from "@/lib/money";

export type DeskOrderData = {
  id: string;
  label: string;
  status: OrderStatus;
  source: "APP" | "AI";
  createdAt: string;
  retailerName: string;
  creditLimitPaise: number;
  outstandingPaise: number;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  rawText: string | null;
  note: string | null;
  lines: {
    id: string;
    skuId: string;
    code: string;
    name: string;
    qtyCases: number;
    freeCases: number;
    discountPaise: number;
    lineTotalPaise: number;
    originalText: string | null;
  }[];
  events: { id: string; action: string; note: string | null; createdAt: string }[];
  products: { id: string; name: string }[];
};

const EVENT_LABEL: Record<string, string> = {
  PLACED: "Order placed",
  CREDIT_HOLD: "Moved to credit hold",
  CONFIRMED: "Confirmed",
  RELEASED: "Released over the credit limit",
  REJECTED: "Rejected",
  LINE_EDITED: "Line corrected",
  EXPORTED: "Exported to Tally",
};

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? "Something went wrong. Please try again.");
  return data;
}

function LineEditor({
  orderId,
  line,
  products,
  editable,
  onDone,
}: {
  orderId: string;
  line: DeskOrderData["lines"][number];
  products: DeskOrderData["products"];
  editable: boolean;
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [skuId, setSkuId] = useState(line.skuId);
  const [qty, setQty] = useState(line.qtyCases);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = skuId !== line.skuId || qty !== line.qtyCases;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const patch: { skuId?: string; qtyCases?: number } = {};
      if (skuId !== line.skuId) patch.skuId = skuId;
      if (qty !== line.qtyCases) patch.qtyCases = qty;
      const data = await call(`/api/desk/orders/${orderId}/lines/${line.id}`, "PATCH", patch);
      onDone(
        data.aliasPhrase
          ? `Saved. "${data.aliasPhrase}" will now match this product for this retailer.`
          : "Line updated and prices recalculated.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="card p-4">
      <div className="flex gap-3">
        <ProductArt code={line.code} size={56} />
        <div className="min-w-0 flex-1">
          {line.originalText && (
            <p className="mb-1 text-xs text-ink-3">
              Retailer wrote: <span className="font-medium text-ink-2">&ldquo;{line.originalText}&rdquo;</span>
            </p>
          )}
          {editable ? (
            <select className="field min-h-[44px]" value={skuId} onChange={(e) => setSkuId(e.target.value)} aria-label="Product">
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[15px] font-semibold">{line.name}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {editable ? (
          <Stepper value={qty} min={1} max={9999} onChange={setQty} label="Cases" />
        ) : (
          <p className="text-sm text-ink-2 tabular-nums">{line.qtyCases} cases</p>
        )}
        <div className="text-right leading-tight">
          {line.freeCases > 0 && <p className="text-sm font-semibold text-turmeric">+{line.freeCases} free</p>}
          {line.discountPaise > 0 && <p className="text-xs text-turmeric tabular-nums">−{formatINR(line.discountPaise)} scheme</p>}
          <p className="text-base font-bold tabular-nums">{formatINR(line.lineTotalPaise)}</p>
        </div>
      </div>

      {editable && dirty && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button small onClick={save} loading={saving}>
            Save correction
          </Button>
          <Button
            small
            variant="ghost"
            onClick={() => {
              setSkuId(line.skuId);
              setQty(line.qtyCases);
              setError(null);
            }}
          >
            Undo
          </Button>
        </div>
      )}
      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
    </li>
  );
}

export function DeskOrderView({ order }: { order: DeskOrderData }) {
  const router = useRouter();
  const open = order.status === "PLACED" || order.status === "CREDIT_HOLD";
  const [busy, setBusy] = useState<"confirm" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const afterPaise = order.outstandingPaise + (open ? order.totalPaise : 0);
  const over = afterPaise > order.creditLimitPaise;
  const pct = Math.min(100, Math.round((afterPaise / Math.max(1, order.creditLimitPaise)) * 100));

  async function confirm() {
    setBusy("confirm");
    setError(null);
    setMessage(null);
    try {
      const data = await call(`/api/desk/orders/${order.id}`, "POST", { action: "confirm" });
      setMessage(data.message);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy("reject");
    setError(null);
    setMessage(null);
    try {
      await call(`/api/desk/orders/${order.id}`, "POST", { action: "reject", reason });
      setRejecting(false);
      setReason("");
      setMessage("Order rejected. Stock has been returned.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reject.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <Link href="/desk" className="inline-flex min-h-[40px] items-center text-sm font-semibold text-ink-2 hover:text-pine">
        ← All orders
      </Link>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tabular-nums">{order.label}</h1>
          <p className="text-sm text-ink-2">
            {order.retailerName} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.source === "AI" && <Chip tone="turmeric">From message</Chip>}
          <StatusChip status={order.status} label={STATUS_LABEL[order.status]} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <section>
          {order.rawText && (
            <div className="card mb-4 p-4">
              <p className="text-xs font-semibold text-ink-3">Original message</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[15px]">{order.rawText}</p>
              <p className="mt-2 text-xs text-ink-3">Change a product below and the retailer&rsquo;s own words are saved for next time.</p>
            </div>
          )}
          {order.note && (
            <p className="mb-4 rounded-xl bg-paper px-4 py-3 text-sm text-ink-2">Retailer note: {order.note}</p>
          )}

          <ul className="space-y-3">
            {order.lines.map((l) => (
              <LineEditor
                key={`${l.id}-${l.skuId}-${l.qtyCases}`}
                orderId={order.id}
                line={l}
                products={order.products}
                editable={open}
                onDone={setMessage}
              />
            ))}
          </ul>

          <div className="card mt-4 p-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-2">Subtotal</dt>
                <dd className="tabular-nums">{formatINR(order.subtotalPaise)}</dd>
              </div>
              {order.discountPaise > 0 && (
                <div className="flex justify-between text-turmeric">
                  <dt>Scheme discount</dt>
                  <dd className="tabular-nums">−{formatINR(order.discountPaise)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
                <dt>Total (excl. GST)</dt>
                <dd className="tabular-nums">{formatINR(order.totalPaise)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <aside className="space-y-4">
          <div className={cx("card p-4", over && open && "border-chilli/40")}>
            <p className="text-sm font-semibold">Credit</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5" role="img" aria-label={`${pct}% of credit limit used after this order`}>
              <div className={cx("h-full rounded-full", over ? "bg-chilli" : "bg-pine")} style={{ width: `${pct}%` }} />
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-2">Limit</dt>
                <dd className="tabular-nums">{formatINR(order.creditLimitPaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Outstanding now</dt>
                <dd className="tabular-nums">{formatINR(order.outstandingPaise)}</dd>
              </div>
              {open && (
                <div className="flex justify-between font-semibold">
                  <dt>After this order</dt>
                  <dd className={cx("tabular-nums", over && "text-chilli")}>{formatINR(afterPaise)}</dd>
                </div>
              )}
            </dl>
            {over && open && (
              <p className="mt-3 flex items-start gap-2 text-sm text-chilli">
                <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
                This order takes the retailer over the credit limit.
              </p>
            )}
          </div>

          {open && (
            <div className="card p-4">
              <p className="text-sm font-semibold">Decision</p>
              {error && (
                <div className="mt-3">
                  <ErrorNote message={error} />
                </div>
              )}
              {message && (
                <div className="mt-3">
                  <Notice tone="pine">{message}</Notice>
                </div>
              )}
              {!rejecting ? (
                <div className="mt-3 grid gap-2">
                  <Button onClick={confirm} loading={busy === "confirm"} disabled={busy !== null}>
                    <IconCheck width={18} height={18} />
                    {order.status === "CREDIT_HOLD" ? "Release and confirm" : "Confirm order"}
                  </Button>
                  <Button variant="danger" onClick={() => setRejecting(true)} disabled={busy !== null}>
                    Reject order
                  </Button>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <label htmlFor="reason" className="text-sm font-semibold">
                    Reason for the retailer
                  </label>
                  <textarea
                    id="reason"
                    className="field min-h-[96px] py-3"
                    value={reason}
                    maxLength={300}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="For example: item discontinued"
                  />
                  <div className="grid gap-2">
                    <Button variant="danger" onClick={reject} loading={busy === "reject"} disabled={reason.trim().length < 3}>
                      Reject and return stock
                    </Button>
                    <Button variant="ghost" onClick={() => setRejecting(false)} disabled={busy !== null}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {!open && message && <Notice tone="pine">{message}</Notice>}

          <div className="card p-4">
            <p className="text-sm font-semibold">History</p>
            <ol className="mt-3 space-y-3">
              {order.events.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="font-semibold">{EVENT_LABEL[e.action] ?? e.action}</p>
                  <p className="text-xs text-ink-3">{formatDateTime(e.createdAt)}</p>
                  {e.note && <p className="mt-0.5 text-ink-2">{e.note}</p>}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
