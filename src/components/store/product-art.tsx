import { cn } from "@/lib/utils";

/**
 * Deterministic on-brand placeholder artwork, shown when a product has no uploaded image
 * (demo catalog, or products created before images are added). Pure SVG, no network.
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function ProductArt({ seed, label, className }: { seed: string; label?: string; className?: string }) {
  const h = hash(seed);
  const pattern = h % 4;
  const cx = 140 + (h % 120); // h is unsigned; use >>> so shifted values stay positive
  const cy = 190 + ((h >>> 8) % 120);
  const r = 70 + ((h >>> 16) % 50);
  const rot = (h >>> 4) % 180;

  return (
    <svg
      viewBox="0 0 400 500"
      role="img"
      aria-label={label ?? "Product image placeholder"}
      className={cn("h-full w-full bg-surface-2", className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="500" fill="#101310" />
      <g stroke="#22c55e" fill="none" strokeWidth="1.25">
        {pattern === 0 &&
          [0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={cx} cy={cy} r={Math.max(2, r - i * 12)} opacity={0.75 - i * 0.11} />)}
        {pattern === 1 && (
          <g transform={`rotate(${rot} ${cx} ${cy})`}>
            <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} opacity={0.7} />
            <rect x={cx - r * 0.66} y={cy - r * 0.66} width={r * 1.33} height={r * 1.33} opacity={0.45} />
            <rect x={cx - r * 0.33} y={cy - r * 0.33} width={r * 0.66} height={r * 0.66} fill="#22c55e" fillOpacity={0.12} opacity={0.6} />
          </g>
        )}
        {pattern === 2 &&
          Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M ${-40 + i * 60} 520 Q ${cx} ${cy - r} ${440 - i * 10} ${-20 + i * 30}`} opacity={0.15 + i * 0.07} />
          ))}
        {pattern === 3 && (
          <>
            {Array.from({ length: 7 }, (_, row) =>
              Array.from({ length: 6 }, (_, col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={60 + col * 56}
                  cy={90 + row * 56}
                  r={2 + ((row + col + (h % 5)) % 4) * 2.5}
                  fill="#22c55e"
                  fillOpacity={0.25 + ((row * col) % 3) * 0.2}
                  stroke="none"
                />
              )),
            )}
          </>
        )}
      </g>
      <text x="24" y="474" fill="#4ade80" opacity="0.5" fontSize="13" letterSpacing="4" fontFamily="var(--font-poppins), sans-serif">
        VEVVION
      </text>
    </svg>
  );
}
