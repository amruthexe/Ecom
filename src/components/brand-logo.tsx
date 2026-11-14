import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Vevvion logo. Assets are generated from the owner's original artwork by `pnpm build-logo`.
 *  - horizontal: leaf + VEVVION (headers)
 *  - full: leaf + VEVVION + "A New Vision To Success" (login pages, footer, hero)
 *  - mark: leaf only (small spaces)
 * The *-dark files have the wordmark lightened for the black site.
 */
const ASSETS = {
  horizontal: { src: "/brand/logo-horizontal-dark.png", width: 720, height: 215 },
  full: { src: "/brand/logo-full-dark.png", width: 1000, height: 345 },
  mark: { src: "/brand/logo-mark-256.png", width: 256, height: 256 },
} as const;

export function BrandLogo({
  variant = "horizontal",
  className,
  priority,
}: {
  variant?: keyof typeof ASSETS;
  /** Set the size with a height class, e.g. "h-8 w-auto". */
  className?: string;
  priority?: boolean;
}) {
  const a = ASSETS[variant];
  return (
    <Image
      src={a.src}
      width={a.width}
      height={a.height}
      alt={variant === "mark" ? "Vevvion" : "Vevvion — A New Vision To Success"}
      priority={priority}
      unoptimized // pre-sized PNGs; served as-is
      className={cn("h-8 w-auto select-none", className)}
      draggable={false}
    />
  );
}

export const BRAND_TAGLINE = "A New Vision To Success";
