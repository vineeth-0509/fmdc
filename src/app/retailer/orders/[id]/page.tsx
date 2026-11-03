import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatDateTime, orderLabel } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { IconCheck } from "@/components/icons";
import { btnClass } from "@/components/ui";
import { RetailerStatusChip, T } from "@/components/OrderStatus";
import { RepeatOrderButton } from "@/components/RepeatOrderButton";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;
  const session = await getSession();

  // Scoped by retailerId: another retailer's order id returns 404, never its data.
  const order = await prisma.order.findFirst({
    where: { id, retailerId: session!.retailerId as string },
    include: {
      lines: { include: { sku: { select: { name: true } } }, orderBy: { id: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const rejection = order.events.find((e) => e.action === "REJECTED");

  return (
    <div className="mx-auto max-w-2xl">
      {placed === "1" && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-pine-soft p-4 text-pine">
          <IconCheck className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              <T k="orderPlaced" />
            </p>
            <p className="text-sm">
              <T k="orderPlacedBody" />
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tabular-nums">{orderLabel(order.seq)}</h1>
          <p className="text-sm text-ink-3">
            <T k="placedOn" /> {formatDateTime(order.createdAt)}
          </p>
        </div>
        <RetailerStatusChip status={order.status} />
      </div>

      {rejection?.note && (
        <p className="mt-3 rounded-xl bg-chilli-soft px-4 py-3 text-sm text-chilli">
          <strong>
            <T k="reason" />:
          </strong>{" "}
          {rejection.note}
        </p>
      )}

      <ul className="card mt-4 divide-y divide-line">
        {order.lines.map((l) => (
          <li key={l.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-snug">{l.sku.name}</p>
              <p className="text-sm text-ink-3 tabular-nums">
                {l.qtyCases} <T k="cases" />
                {l.freeCases > 0 && (
                  <span className="font-semibold text-turmeric">
                    {" "}
                    · <T k="freeCases" vars={{ n: l.freeCases }} />
                  </span>
                )}
              </p>
            </div>
            <p className="font-semibold tabular-nums">{formatINR(l.lineTotalPaise)}</p>
          </li>
        ))}
        <li className="space-y-1.5 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-2">
              <T k="subtotal" />
            </span>
            <span className="tabular-nums">{formatINR(order.subtotalPaise)}</span>
          </div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-turmeric">
              <span>
                <T k="schemeDiscount" />
              </span>
              <span className="tabular-nums">−{formatINR(order.discountPaise)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 text-lg font-bold">
            <span>
              <T k="total" />
            </span>
            <span className="tabular-nums">{formatINR(order.totalPaise)}</span>
          </div>
          <p className="pt-1 text-xs text-ink-3">
            <T k="gstNote" />
          </p>
        </li>
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <RepeatOrderButton lines={order.lines.map((l) => ({ skuId: l.skuId, qty: l.qtyCases }))} />
        <Link href="/retailer" className={btnClass("ghost")}>
          <T k="backToCatalogue" />
        </Link>
      </div>
    </div>
  );
}
