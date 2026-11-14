"use client";

import { AnimatePresence, motion } from "motion/react";
import { Lock, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatPaise, splitInclusiveGst } from "@/lib/money";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { Price } from "@/components/ui/price";
import { cartCount, cartStore, cartSubtotal, MAX_QTY_PER_LINE, useCart } from "./cart-store";
import { ProductMedia } from "./product-media";
import { QuantityStepper } from "./quantity-stepper";

/** Display GST rate for the summary breakdown; real rate comes from StoreSettings in Phase 8. */
const DISPLAY_GST_PERCENT = 18;

export function CartView() {
  const lines = useCart();

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-10" />}
        title="Your cart is empty"
        description="Browse the collection and add something you love."
        action={
          <Link href="/products" className={buttonClasses("primary", "lg")}>
            Start shopping
          </Link>
        }
      />
    );
  }

  const subtotal = cartSubtotal(lines);
  const mrpTotal = lines.reduce((s, l) => s + l.mrpPaise * l.qty, 0);
  const savings = mrpTotal - subtotal;
  const { gstPaise } = splitInclusiveGst(subtotal, DISPLAY_GST_PERCENT);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.li
              key={line.key}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-4 overflow-hidden p-4"
            >
              <Link href={`/products/${line.slug}`} className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-md border border-border sm:w-24">
                <ProductMedia image={line.imageUrl ? { url: line.imageUrl, alt: line.name } : undefined} seed={line.slug} alt={line.name} sizes="96px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${line.slug}`} className="line-clamp-2 font-medium text-fg-strong hover:underline">
                      {line.name}
                    </Link>
                    {line.optionsLabel && <p className="mt-0.5 text-xs text-fg-muted">{line.optionsLabel}</p>}
                  </div>
                  <p className="shrink-0 font-semibold text-fg-strong tabular-nums">{formatPaise(line.unitPricePaise * line.qty)}</p>
                </div>
                <Price size="sm" pricePaise={line.unitPricePaise} mrpPaise={line.mrpPaise} className="text-xs" />
                <div className="mt-auto flex items-center justify-between gap-3">
                  <QuantityStepper
                    size="sm"
                    value={line.qty}
                    max={Math.min(line.maxQty, MAX_QTY_PER_LINE)}
                    onChange={(n) => cartStore.setQty(line.key, n)}
                    label={`Quantity for ${line.name}`}
                  />
                  <button
                    onClick={() => cartStore.remove(line.key)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-fg-muted hover:bg-danger/10 hover:text-danger"
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="size-4" /> Remove
                  </button>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <aside className="h-fit rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-28">
        <h2 className="font-display text-lg font-semibold text-fg-strong">Order summary</h2>
        <dl className="mt-5 space-y-3 text-sm">
          <Row label={`Items (${cartCount(lines)})`} value={formatPaise(mrpTotal)} />
          {savings > 0 && <Row label="Discount" value={`− ${formatPaise(savings)}`} accent />}
          <Row label="Shipping" value="Calculated at checkout" muted />
          <div className="border-t border-border pt-3">
            <Row label="Subtotal" value={formatPaise(subtotal)} strong />
            <p className="mt-1 text-xs text-fg-muted">Includes approx. {formatPaise(gstPaise)} GST</p>
          </div>
        </dl>
        <Button size="lg" className="mt-6 w-full" disabled title="Checkout is enabled in a later phase">
          <Lock className="size-4" /> Checkout — coming soon
        </Button>
        <p className="mt-3 text-center text-xs text-fg-muted">Final prices and stock are confirmed at checkout.</p>
      </aside>
    </div>
  );
}

function Row({ label, value, strong, muted, accent }: { label: string; value: string; strong?: boolean; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "font-medium text-fg-strong" : "text-fg-muted"}>{label}</dt>
      <dd className={strong ? "font-semibold text-fg-strong tabular-nums" : muted ? "text-fg-muted" : accent ? "text-accent tabular-nums" : "text-fg tabular-nums"}>
        {value}
      </dd>
    </div>
  );
}
