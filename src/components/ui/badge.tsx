import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "accent" | "neutral" | "warning" | "danger" | "solid";

const tones: Record<Tone, string> = {
  accent: "border-accent/40 bg-accent/10 text-fg-strong",
  neutral: "border-border bg-surface-2 text-fg-muted",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  solid: "border-transparent bg-accent text-accent-contrast",
};

export function Badge({ tone = "accent", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
