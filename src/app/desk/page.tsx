import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { STATUS_LABEL, formatDateTime, orderLabel } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { IconList } from "@/components/icons";
import { Chip, EmptyState, StatusChip, cx } from "@/components/ui";
import { DeskRowActions } from "@/components/DeskRowActions";

export const metadata = { title: "Orders" };

const FILTERS: { key: string; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "review", label: "Needs review", statuses: ["PLACED", "CREDIT_HOLD"] },
  { key: "confirmed", label: "Confirmed", statuses: ["CONFIRMED"] },
  { key: "exported", label: "Exported", statuses: ["EXPORTED"] },
  { key: "rejected", label: "Rejected", statuses: ["REJECTED"] },
  { key: "all", label: "All", statuses: null },
];

export default async function DeskPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = FILTERS.find((f) => f.key === status) ?? FILTERS[0];

  const [orders, grouped] = await Promise.all([
    prisma.order.findMany({
      where: filter.statuses ? { status: { in: filter.statuses } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { retailer: { select: { name: true } }, _count: { select: { lines: true } } },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const count = (s: OrderStatus) => grouped.find((g) => g.status === s)?._count._all ?? 0;
  const counts: Record<string, number> = {
    review: count("PLACED") + count("CREDIT_HOLD"),
    confirmed: count("CONFIRMED"),
    exported: count("EXPORTED"),
    rejected: count("REJECTED"),
    all: grouped.reduce((s, g) => s + g._count._all, 0),
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-ink-2">Awaiting review</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{count("PLACED")}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-ink-2">On credit hold</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-chilli">{count("CREDIT_HOLD")}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-ink-2">Ready for Tally</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-pine">{count("CONFIRMED")}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter orders">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "review" ? "/desk" : `/desk?status=${f.key}`}
            role="tab"
            aria-selected={f.key === filter.key}
            className={cx(
              "inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
              f.key === filter.key ? "border-pine bg-pine text-white" : "border-line-strong bg-white text-ink-2 hover:bg-pine-soft",
            )}
          >
            {f.label}
            <span className={cx("tabular-nums", f.key === filter.key ? "text-white/80" : "text-ink-3")}>{counts[f.key]}</span>
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={<IconList />} title="Nothing here" body="Orders that match this filter will appear in this list." />
      ) : (
        <>
          <div className="card mt-4 hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-ink-2">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Retailer</th>
                  <th className="px-4 py-3 font-semibold">Placed</th>
                  <th className="px-4 py-3 text-right font-semibold">Items</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id} className={cx("hover:bg-pine-soft/40", o.status === "CREDIT_HOLD" && "bg-chilli-soft/40")}>
                    <td className="px-4 py-3">
                      <Link href={`/desk/orders/${o.id}`} className="inline-flex items-center gap-2 font-semibold tabular-nums text-pine underline-offset-2 hover:underline">
                        {orderLabel(o.seq)}
                      </Link>
                      {o.source === "AI" && <span className="ml-2"><Chip tone="turmeric">From message</Chip></span>}
                    </td>
                    <td className="px-4 py-3">{o.retailer.name}</td>
                    <td className="px-4 py-3 text-ink-2">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{o._count.lines}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatINR(o.totalPaise)}</td>
                    <td className="px-4 py-3">
                      <StatusChip status={o.status} label={STATUS_LABEL[o.status]} />
                    </td>
                    <td className="px-4 py-3">
                      <DeskRowActions id={o.id} status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-4 space-y-3 md:hidden">
            {orders.map((o) => (
              <li key={o.id} className={cx("card p-4", o.status === "CREDIT_HOLD" && "border-chilli/40")}>
                <Link href={`/desk/orders/${o.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold tabular-nums">{orderLabel(o.seq)}</p>
                      <p className="text-sm">{o.retailer.name}</p>
                    </div>
                    <StatusChip status={o.status} label={STATUS_LABEL[o.status]} />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-sm text-ink-3">
                      {formatDateTime(o.createdAt)} · {o._count.lines} items
                      {o.source === "AI" && " · from message"}
                    </p>
                    <p className="text-lg font-bold tabular-nums">{formatINR(o.totalPaise)}</p>
                  </div>
                </Link>
                <div className="mt-3 border-t border-line pt-3">
                  <DeskRowActions id={o.id} status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
