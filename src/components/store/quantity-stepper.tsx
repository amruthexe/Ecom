"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (n: number) => void;
  size?: "sm" | "md";
  label?: string;
}) {
  const btn = cn(
    "grid place-items-center text-fg transition-colors hover:bg-surface-2 hover:text-fg-strong disabled:opacity-40 disabled:hover:bg-transparent",
    size === "sm" ? "size-8" : "size-10",
  );
  return (
    <div className="inline-flex items-center rounded-md border border-border" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="size-4" />
      </button>
      <span className={cn("text-center font-medium text-fg-strong tabular-nums", size === "sm" ? "w-8 text-sm" : "w-10")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
