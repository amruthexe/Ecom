import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

/** Header logo: leaf + VEVVION, links home. */
export function Logo({ variant = "horizontal", className }: { variant?: "horizontal" | "full"; className?: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center" aria-label="Vevvion home">
      <BrandLogo variant={variant} priority className={className ?? "h-7 w-auto sm:h-9"} />
    </Link>
  );
}
