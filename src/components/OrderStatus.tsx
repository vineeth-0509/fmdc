"use client";

import type { OrderStatus } from "@prisma/client";
import { useLang } from "@/components/lang";
import { StatusChip } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";

export function RetailerStatusChip({ status }: { status: OrderStatus }) {
  const { t } = useLang();
  return <StatusChip status={status} label={t(`status${status}` as DictKey)} />;
}

export function T({ k, vars }: { k: DictKey; vars?: Record<string, string | number> }) {
  const { t } = useLang();
  return <>{t(k, vars)}</>;
}

export function OrdersEmpty() {
  const { t } = useLang();
  return (
    <>
      <h2 className="text-lg font-semibold">{t("ordersEmptyTitle")}</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-2">{t("ordersEmptyBody")}</p>
    </>
  );
}
