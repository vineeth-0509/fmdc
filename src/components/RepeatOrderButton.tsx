"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart";
import { useLang } from "@/components/lang";
import { IconRepeat } from "@/components/icons";
import { Button } from "@/components/ui";

export function RepeatOrderButton({ lines, small }: { lines: { skuId: string; qty: number }[]; small?: boolean }) {
  const router = useRouter();
  const { replaceAll } = useCart();
  const { t } = useLang();
  return (
    <Button
      variant="secondary"
      small={small}
      onClick={() => {
        replaceAll(lines.map((l) => ({ skuId: l.skuId, qty: l.qty })));
        router.push("/retailer/cart");
      }}
    >
      <IconRepeat width={18} height={18} />
      {t("reorder")}
    </Button>
  );
}
