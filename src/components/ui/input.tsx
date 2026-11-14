import type { InputHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const field =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg-strong placeholder:text-fg-muted/70 transition-colors hover:border-border-strong focus:border-accent focus:outline-none";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, "cursor-pointer appearance-none pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-medium tracking-wide text-fg-muted uppercase", className)} {...props} />;
}
