"use client";

import Link from "next/link";
import { useCart } from "@/components/cart";
import { useLang } from "@/components/lang";
import { IconArrow } from "@/components/icons";

/** Sticky "view cart" bar shown on catalogue and product screens once the cart has something in it. */
export function CartBar() {
  const { count } = useCart();
  const { t } = useLang();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(58px_+_env(safe-area-inset-bottom,0px))] z-20 px-4 md:bottom-6">
      <Link href="/retailer/cart" className="btn btn-primary mx-auto flex max-w-md justify-between shadow-bar">
        <span>{t("itemsInCart", { n: count })}</span>
        <span className="inline-flex items-center gap-2">
          {t("viewCart")} <IconArrow width={18} height={18} />
        </span>
      </Link>
    </div>
  );
}
