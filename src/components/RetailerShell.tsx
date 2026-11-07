"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useCart } from "@/components/cart";
import { useLang } from "@/components/lang";
import { IconBag, IconList, IconLogout, IconMessage, IconStore } from "@/components/icons";
import { cx } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import type { DictKey } from "@/lib/i18n";

const TABS: { href: string; key: DictKey; Icon: typeof IconStore; exact?: boolean }[] = [
  { href: "/retailer", key: "navCatalogue", Icon: IconStore, exact: true },
  { href: "/retailer/capture", key: "navMessage", Icon: IconMessage },
  { href: "/retailer/cart", key: "navCart", Icon: IconBag },
  { href: "/retailer/orders", key: "navOrders", Icon: IconList },
];

export function BrandMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine text-[17px] font-bold text-white" aria-hidden>
      A
    </span>
  );
}

export function RetailerShell({ retailerName, children }: { retailerName: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const { t, lang, setLang } = useLang();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <BrandMark />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[15px] font-semibold">{retailerName}</p>
            <p className="text-xs text-ink-3">
              {BRAND}
              {process.env.NEXT_PUBLIC_DEMO_HINTS === "true" && <span className="ml-2 rounded bg-turmeric-soft px-1.5 py-0.5 text-[10px] font-bold text-amber">SAMPLE DATA</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="min-h-[40px] rounded-lg border border-line-strong bg-white px-3 text-sm font-semibold"
          >
            {t("language")}
          </button>
          <button
            type="button"
            onClick={logout}
            disabled={leaving}
            className="grid h-10 w-10 place-items-center rounded-lg text-ink-2 hover:bg-black/5"
            aria-label={t("logout")}
          >
            <IconLogout />
          </button>
        </div>
        <nav className="hidden gap-1 px-4 pb-2 md:flex" aria-label="Main">
          {TABS.map(({ href, key, Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cx(
                "inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-sm font-semibold",
                isActive(href, exact) ? "bg-pine-soft text-pine" : "text-ink-2 hover:bg-black/5",
              )}
            >
              <Icon width={18} height={18} />
              {t(key)}
              {href === "/retailer/cart" && count > 0 && (
                <span className="rounded-full bg-pine px-1.5 text-xs text-white">{count}</span>
              )}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 pb-32 pt-4 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-safe md:hidden" aria-label="Main">
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map(({ href, key, Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                    active ? "text-pine" : "text-ink-3",
                  )}
                >
                  <Icon />
                  <span className="max-w-[76px] truncate">{t(key)}</span>
                  {href === "/retailer/cart" && count > 0 && (
                    <span className="absolute right-[22%] top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-turmeric px-1 text-[11px] text-white">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
