import { discountPercent, formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  pricePaise,
  mrpPaise,
  size = "md",
  prefix,
  className,
}: {
  pricePaise: number;
  mrpPaise?: number;
  size?: "sm" | "md" | "lg";
  prefix?: string;
  className?: string;
}) {
  const onSale = mrpPaise !== undefined && mrpPaise > pricePaise;
  const off = onSale ? discountPercent(mrpPaise, pricePaise) : 0;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-semibold text-fg-strong tabular-nums",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-2xl sm:text-3xl",
        )}
      >
        {prefix && <span className="mr-1 text-xs font-normal text-fg-muted">{prefix}</span>}
        {formatPaise(pricePaise)}
      </span>
      {onSale && (
        <>
          <s className={cn("text-fg-muted tabular-nums", size === "lg" ? "text-base" : "text-xs")}>{formatPaise(mrpPaise)}</s>
          <span className={cn("font-medium text-accent", size === "lg" ? "text-sm" : "text-xs")}>{off}% off</span>
        </>
      )}
    </div>
  );
}
