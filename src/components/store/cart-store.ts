"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * Client-side cart (guest-friendly, persisted in localStorage).
 * Prices here are DISPLAY ONLY. Checkout (Phase 8) re-reads prices and stock on the server.
 */

const STORAGE_KEY = "vevvion.cart.v1";
const MAX_QTY_PER_LINE = 10;

const lineSchema = z.object({
  key: z.string(),
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  variantId: z.string().optional(),
  optionsLabel: z.string().optional(),
  unitPricePaise: z.number().int().nonnegative(),
  /** Delivery per unit (display only). Older saved carts don't have it → 0 until refreshed. */
  unitDeliveryPaise: z.number().int().nonnegative().default(0),
  mrpPaise: z.number().int().nonnegative(),
  qty: z.number().int().min(1),
  maxQty: z.number().int().min(0),
  imageUrl: z.string().optional(),
});

export type CartLine = z.infer<typeof lineSchema>;

const EMPTY: CartLine[] = [];
let cache: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): CartLine[] {
  if (loaded) return cache;
  loaded = true;
  try {
    const parsed = z.array(lineSchema).safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    cache = parsed.success ? parsed.data : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function commit(next: CartLine[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode) — keep in memory */
  }
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  loaded = false;
  load();
  listeners.forEach((l) => l());
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: load,
  getServerSnapshot: () => EMPTY,

  /** Adds or increments a line. Returns the resulting quantity. */
  add(line: Omit<CartLine, "key" | "qty" | "unitDeliveryPaise"> & { unitDeliveryPaise?: number }, qty: number): number {
    const key = `${line.productId}:${line.variantId ?? "-"}`;
    const lines = load();
    const existing = lines.find((l) => l.key === key);
    const cap = Math.min(line.maxQty, MAX_QTY_PER_LINE);
    const nextQty = Math.min((existing?.qty ?? 0) + qty, cap);
    if (nextQty < 1) return existing?.qty ?? 0;
    const full = { ...line, unitDeliveryPaise: line.unitDeliveryPaise ?? 0 };
    const next = existing
      ? lines.map((l) => (l.key === key ? { ...l, ...full, qty: nextQty } : l))
      : [...lines, { ...full, key, qty: nextQty }];
    commit(next);
    return nextQty;
  },
  setQty(key: string, qty: number) {
    commit(
      load().map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(qty, l.maxQty, MAX_QTY_PER_LINE)) } : l)),
    );
  },
  remove(key: string) {
    commit(load().filter((l) => l.key !== key));
  },
  clear() {
    commit(EMPTY);
  },
  /** Replace the whole cart (used when syncing with the customer's account). */
  replace(lines: (Omit<CartLine, "key" | "unitDeliveryPaise"> & { unitDeliveryPaise?: number })[]) {
    commit(lines.map((l) => ({ ...l, unitDeliveryPaise: l.unitDeliveryPaise ?? 0, key: `${l.productId}:${l.variantId ?? "-"}` })));
  },
};

export function useCart(): CartLine[] {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0);
}

/** Delivery is charged per piece (owner decision 2026-11-21). */
export function cartDelivery(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + (l.unitDeliveryPaise ?? 0) * l.qty, 0);
}

export { MAX_QTY_PER_LINE };
