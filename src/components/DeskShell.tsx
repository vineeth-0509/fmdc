"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandMark } from "@/components/RetailerShell";
import { IconDownload, IconList, IconLogout, IconSheet } from "@/components/icons";
import { cx } from "@/components/ui";
import { BRAND } from "@/lib/brand";

const TABS = [
  { href: "/desk", label: "Orders", Icon: IconList, exact: false },
  { href: "/desk/export", label: "Tally export", Icon: IconDownload, exact: false },
  { href: "/desk/reports", label: "Reports", Icon: IconSheet, exact: false },
];

export function DeskShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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

  const active = (href: string) => (href === "/desk" ? pathname === "/desk" || pathname.startsWith("/desk/orders") : pathname.startsWith(href));

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <BrandMark />
          <div className="flex-1 leading-tight">
            <p className="text-[15px] font-semibold">Order desk</p>
            <p className="text-xs text-ink-3">
              {BRAND}
              {process.env.NEXT_PUBLIC_DEMO_HINTS === "true" && <span className="ml-2 rounded bg-turmeric-soft px-1.5 py-0.5 text-[10px] font-bold text-amber">SAMPLE DATA</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={leaving}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-2 hover:bg-black/5"
          >
            <IconLogout width={18} height={18} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
        <nav className="flex gap-1 px-4 pb-2" aria-label="Order desk">
          {TABS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cx(
                "inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-sm font-semibold",
                active(href) ? "bg-pine-soft text-pine" : "text-ink-2 hover:bg-black/5",
              )}
            >
              <Icon width={18} height={18} />
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 px-4 pb-10 pt-4">{children}</main>
    </div>
  );
}
