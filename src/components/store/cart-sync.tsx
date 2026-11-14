"use client";

import { useEffect, useRef } from "react";
import { cartStore, type CartLine } from "./cart-store";

const OWNER_KEY = "vevvion.cart.owner";

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}
function writeOwner(v: string | null) {
  try {
    if (v) localStorage.setItem(OWNER_KEY, v);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* ignore */
  }
}

type ServerLine = Omit<CartLine, "key">;
const keyOf = (l: { productId: string; variantId?: string }) => `${l.productId}:${l.variantId ?? "-"}`;
const toItems = (lines: { productId: string; variantId?: string; qty: number }[]) => lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty }));

/**
 * Keeps the cart in sync with the signed-in customer's account, so it is the same on every device.
 * - Guest cart + login → merged into the account cart.
 * - Signed in → account cart loads on this device; changes are saved back.
 * - Signed out → cart is cleared from this device (shared phones stay private).
 */
export function CartSync({ userId }: { userId: string | null }) {
  const ready = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const owner = readOwner();

    if (!userId) {
      if (owner) {
        cartStore.clear();
        writeOwner(null);
      }
      return;
    }

    (async () => {
      const res = await fetch("/api/cart", { cache: "no-store" }).catch(() => null);
      if (!res?.ok || cancelled) return;
      const data: { lines: ServerLine[] } = await res.json();
      const local = cartStore.getSnapshot();
      let next: ServerLine[] = data.lines;
      if (!owner) {
        // First load after logging in on this device: merge the guest cart into the account cart.
        const byKey = new Map(next.map((l) => [keyOf(l), l]));
        for (const l of local) {
          const existing = byKey.get(keyOf(l));
          const max = Math.min(existing?.maxQty ?? l.maxQty, 10);
          byKey.set(keyOf(l), existing ? { ...existing, qty: Math.min(Math.max(existing.qty, l.qty), Math.max(max, 1)) } : { ...l });
        }
        next = [...byKey.values()];
      }
      cartStore.replace(next);
      writeOwner(userId);
      if (!owner && local.length) {
        await fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: toItems(next) }) }).catch(() => {});
      }
      ready.current = true;
    })();

    // Save changes back to the account (debounced).
    const unsubscribe = cartStore.subscribe(() => {
      if (!ready.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: toItems(cartStore.getSnapshot()) }) }).catch(() => {});
      }, 400);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [userId]);

  return null;
}
