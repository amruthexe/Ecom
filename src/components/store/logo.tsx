import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Vevvion home">
      <span aria-hidden className="grid size-7 place-items-center rounded-[6px] bg-accent font-display text-sm font-bold text-accent-contrast">
        V
      </span>
      <span className="font-display text-lg font-semibold tracking-[0.18em] text-fg-strong">VEVVION</span>
    </Link>
  );
}
