import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatDateTime, orderLabel } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { IconList } from "@/components/icons";
import { btnClass } from "@/components/ui";
import { OrdersEmpty, RetailerStatusChip, T } from "@/components/OrderStatus";
import { RepeatOrderButton } from "@/components/RepeatOrderButton";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const session = await getSession();
  const orders = await prisma.order.findMany({
    where: { retailerId: session!.retailerId as string },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { lines: { select: { skuId: true, qtyCases: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">
        <T k="ordersTitle" />
      </h1>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-pine-soft text-pine">
            <IconList />
          </div>
          <OrdersEmpty />
          <Link href="/retailer" className={btnClass("primary", false, "mt-5")}>
            <T k="browse" />
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="card p-4">
              <Link href={`/retailer/orders/${o.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold tabular-nums">{orderLabel(o.seq)}</p>
                    <p className="text-sm text-ink-3">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <RetailerStatusChip status={o.status} />
                </div>
                <p className="mt-3 text-lg font-bold tabular-nums">{formatINR(o.totalPaise)}</p>
              </Link>
              <div className="mt-3">
                <RepeatOrderButton small lines={o.lines.map((l) => ({ skuId: l.skuId, qty: l.qtyCases }))} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
