"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = { skuId: string; qty: number; originalText?: string };

type Ctx = {
  items: CartItem[];
  captureId: string | null;
  ready: boolean;
  count: number;
  qtyOf: (skuId: string) => number;
  setQty: (skuId: string, qty: number) => void;
  addMany: (items: CartItem[], captureId?: string | null) => void;
  replaceAll: (items: CartItem[]) => void;
  clear: () => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "cart:v1";

function sanitize(raw: unknown): { items: CartItem[]; captureId: string | null } {
  const empty = { items: [] as CartItem[], captureId: null };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as { items?: unknown; captureId?: unknown };
  const items = Array.isArray(r.items)
    ? r.items
        .filter(
          (i): i is CartItem =>
            !!i && typeof i.skuId === "string" && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 9999,
        )
        .map((i) => ({ skuId: i.skuId, qty: i.qty, originalText: typeof i.originalText === "string" ? i.originalText : undefined }))
    : [];
  return { items, captureId: typeof r.captureId === "string" ? r.captureId : null };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = sanitize(JSON.parse(localStorage.getItem(KEY) ?? "null"));
      setItems(saved.items);
      setCaptureId(saved.captureId);
    } catch {
      /* storage unavailable or corrupt: start with an empty cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ items, captureId }));
    } catch {
      /* ignore */
    }
  }, [items, captureId, ready]);

  const setQty = useCallback((skuId: string, qty: number) => {
    setItems((prev) => {
      const rest = prev.filter((i) => i.skuId !== skuId);
      if (qty <= 0) return rest;
      const existing = prev.find((i) => i.skuId === skuId);
      const next = { skuId, qty: Math.min(qty, 9999), originalText: existing?.originalText };
      return existing ? prev.map((i) => (i.skuId === skuId ? next : i)) : [...rest, next];
    });
  }, []);

  const addMany = useCallback((add: CartItem[], newCaptureId?: string | null) => {
    setItems((prev) => {
      const map = new Map<string, CartItem>(prev.map((i): [string, CartItem] => [i.skuId, { ...i }]));
      for (const a of add) {
        const cur = map.get(a.skuId);
        if (cur) {
          cur.qty = Math.min(9999, cur.qty + a.qty);
          cur.originalText = cur.originalText ?? a.originalText;
        } else {
          map.set(a.skuId, { ...a });
        }
      }
      return [...map.values()];
    });
    if (newCaptureId) setCaptureId(newCaptureId);
  }, []);

  const replaceAll = useCallback((next: CartItem[]) => {
    setItems(next);
    setCaptureId(null);
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setCaptureId(null);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      captureId,
      ready,
      count: items.length,
      qtyOf: (skuId) => items.find((i) => i.skuId === skuId)?.qty ?? 0,
      setQty,
      addMany,
      replaceAll,
      clear,
    }),
    [items, captureId, ready, setQty, addMany, replaceAll, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
