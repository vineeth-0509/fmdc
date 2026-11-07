"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { IconCheck } from "@/components/icons";
import { Button, btnClass } from "@/components/ui";

/** Approve straight from the list, or open the order to review and correct it first. */
export function DeskRowActions({ id, status }: { id: string; status: OrderStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/desk/orders/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not approve.");
      if (data.status === "CREDIT_HOLD") setMsg("Moved to credit hold");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not approve.");
    } finally {
      setBusy(false);
    }
  }

  const open = status === "PLACED" || status === "CREDIT_HOLD";
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === "PLACED" && (
        <Button small onClick={approve} loading={busy}>
          <IconCheck width={16} height={16} /> Approve
        </Button>
      )}
      <Link href={`/desk/orders/${id}`} className={btnClass(status === "CREDIT_HOLD" ? "primary" : "secondary", true)}>
        {open ? "Review" : "View"}
      </Link>
      {msg && <span className="w-full text-right text-xs text-chilli">{msg}</span>}
    </div>
  );
}
