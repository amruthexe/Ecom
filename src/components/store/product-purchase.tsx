"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { findVariant, hasVariants, priceOf, stockState, totalStock } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { cartStore, MAX_QTY_PER_LINE } from "./cart-store";
import { QuantityStepper } from "./quantity-stepper";

export function ProductPurchase({ product }: { product: Product }) {
  const withVariants = hasVariants(product);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = withVariants ? findVariant(product, selected) : undefined;
  const allChosen = !withVariants || product.options.every((o) => selected[o.name]);
  const stock = withVariants ? (variant?.stock ?? 0) : product.stock;
  const price = priceOf(product, variant);
  const anyStock = totalStock(product) > 0;
  const state = allChosen ? stockState(stock) : anyStock ? "in_stock" : "out_of_stock";
  const maxQty = Math.max(1, Math.min(stock, MAX_QTY_PER_LINE));

  /** Is this option value purchasable given the other current selections? */
  function valueAvailable(optionName: string, value: string): boolean {
    return product.variants.some(
      (v) =>
        v.stock > 0 &&
        v.options[optionName] === value &&
        Object.entries(selected).every(([k, val]) => k === optionName || v.options[k] === val),
    );
  }

  function choose(name: string, value: string) {
    setSelected((s) => ({ ...s, [name]: value }));
    setQty(1);
    setAdded(false);
  }

  function addToCart() {
    if (!allChosen || stock <= 0) return;
    cartStore.add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantId: variant?.id,
        optionsLabel: variant ? Object.values(variant.options).join(" / ") : undefined,
        unitPricePaise: price.pricePaise,
        mrpPaise: price.mrpPaise,
        maxQty: stock,
        imageUrl: product.images[0]?.url,
      },
      qty,
    );
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Price size="lg" pricePaise={price.pricePaise} mrpPaise={price.mrpPaise} />
        <p className="mt-1 text-xs text-fg-muted">Inclusive of all taxes (GST)</p>
      </div>

      {product.options.map((option) => (
        <fieldset key={option.name}>
          <legend className="mb-2.5 text-sm text-fg-muted">
            {option.name}
            {selected[option.name] && <span className="ml-2 text-fg-strong">{selected[option.name]}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const available = valueAvailable(option.name, value);
              const isSelected = selected[option.name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(option.name, value)}
                  aria-pressed={isSelected}
                  className={cn(
                    "h-10 min-w-12 rounded-md border px-3 text-sm transition-colors",
                    isSelected
                      ? "border-accent bg-accent/10 text-fg-strong"
                      : "border-border text-fg hover:border-border-strong hover:text-fg-strong",
                    !available && "text-fg-muted/60 line-through decoration-fg-muted/60",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <StockLine state={state} stock={stock} allChosen={allChosen} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <QuantityStepper value={qty} max={maxQty} onChange={(n) => setQty(Math.max(1, Math.min(n, maxQty)))} />
        <Button size="lg" className="flex-1" onClick={addToCart} disabled={!allChosen || stock <= 0}>
          <ShoppingBag className="size-4" />
          {!anyStock ? "Sold out" : !allChosen ? `Select ${product.options.find((o) => !selected[o.name])?.name.toLowerCase()}` : stock <= 0 ? "Out of stock" : "Add to cart"}
        </Button>
      </div>

      <AnimatePresence>
        {added && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm"
            role="status"
          >
            <span className="flex items-center gap-2 text-fg-strong">
              <Check className="size-4" /> Added to your cart
            </span>
            <Link href="/cart" className={buttonClasses("outline", "sm")}>
              View cart
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StockLine({ state, stock, allChosen }: { state: string; stock: number; allChosen: boolean }) {
  if (!allChosen && state !== "out_of_stock") return <p className="text-sm text-fg-muted">Choose options to see availability</p>;
  if (state === "out_of_stock") return <p className="text-sm text-danger">Currently out of stock</p>;
  if (state === "low_stock") return <p className="text-sm text-warning">Only {stock} left — order soon</p>;
  return (
    <p className="flex items-center gap-2 text-sm text-fg">
      <span className="size-2 rounded-full bg-accent" /> In stock
    </p>
  );
}
