"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Order-success celebration: paper confetti + little five-petal flowers burst from both sides and
 * flutter down. Pure canvas (no dependency), pointer-events none, ~5 s, then removed.
 * Plays once per order per browser session and never for users who prefer reduced motion.
 */
const COLORS = ["#22c55e", "#4ade80", "#86efac", "#facc15", "#fb7185", "#f472b6", "#ffffff", "#fde68a", "#a3e635"];
const FLOWER_COLORS = ["#fb7185", "#f472b6", "#facc15", "#ffffff", "#c084fc"];

type Kind = "paper" | "dot" | "flower";
type P = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string; kind: Kind; tilt: number; vt: number; life: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function Celebration({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // empty canvas, invisible + click-through
    const key = `vevvion.celebrated.${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* storage unavailable: just play */
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const parts: P[] = [];
    const scale = Math.min(1, w / 900) * 0.5 + 0.5; // fewer/smaller bursts on phones
    const burst = (fromLeft: boolean, n: number) => {
      for (let i = 0; i < n; i++) {
        const angle = fromLeft ? rand(-75, -35) : rand(-145, -105);
        const speed = rand(9, 17) * (h / 800 + 0.4);
        const kind: Kind = Math.random() < 0.22 ? "flower" : Math.random() < 0.3 ? "dot" : "paper";
        parts.push({
          x: fromLeft ? rand(-10, w * 0.05) : rand(w * 0.95, w + 10),
          y: h * rand(0.75, 0.95),
          vx: Math.cos((angle * Math.PI) / 180) * speed,
          vy: Math.sin((angle * Math.PI) / 180) * speed,
          rot: rand(0, Math.PI * 2),
          vr: rand(-0.2, 0.2),
          size: (kind === "flower" ? rand(7, 11) : rand(5, 9)) * scale + 2,
          color: kind === "flower" ? pick(FLOWER_COLORS) : pick(COLORS),
          kind,
          tilt: rand(0, Math.PI * 2),
          vt: rand(0.05, 0.15),
          life: 0,
        });
      }
    };
    const rain = (n: number) => {
      for (let i = 0; i < n; i++) {
        const kind: Kind = Math.random() < 0.35 ? "flower" : "paper";
        parts.push({
          x: rand(0, w),
          y: rand(-h * 0.4, -10),
          vx: rand(-1, 1),
          vy: rand(1, 3),
          rot: rand(0, Math.PI * 2),
          vr: rand(-0.1, 0.1),
          size: (kind === "flower" ? rand(7, 11) : rand(5, 8)) * scale + 2,
          color: kind === "flower" ? pick(FLOWER_COLORS) : pick(COLORS),
          kind,
          tilt: rand(0, Math.PI * 2),
          vt: rand(0.04, 0.1),
          life: 0,
        });
      }
    };

    const count = Math.round(90 * scale);
    burst(true, count);
    burst(false, count);
    const timers = [
      window.setTimeout(() => rain(Math.round(70 * scale)), 450),
      window.setTimeout(() => {
        burst(true, Math.round(count / 2));
        burst(false, Math.round(count / 2));
      }, 900),
    ];

    const drawFlower = (p: P) => {
      ctx.fillStyle = p.color;
      for (let k = 0; k < 5; k++) {
        ctx.save();
        ctx.rotate((k * 2 * Math.PI) / 5);
        ctx.beginPath();
        ctx.ellipse(0, -p.size * 0.55, p.size * 0.32, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    };

    const start = performance.now();
    let raf = 0;
    let marked = false;
    const frame = (t: number) => {
      if (!marked) {
        // Mark as played only once it actually draws (React dev mode mounts effects twice).
        marked = true;
        try {
          sessionStorage.setItem(key, "1");
        } catch {
          /* ignore */
        }
      }
      const elapsed = t - start;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.life++;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + (p.kind === "flower" ? 0.16 : 0.22); // flowers float a little slower
        p.x += p.vx + Math.sin(p.tilt) * (p.kind === "paper" ? 0.6 : 0.9);
        p.y += p.vy;
        p.rot += p.vr;
        p.tilt += p.vt;
        if (p.y > h + 30) continue;
        const fade = elapsed > 4000 ? Math.max(0, 1 - (elapsed - 4000) / 1000) : 1;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.kind === "flower") drawFlower(p);
        else if (p.kind === "dot") {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.scale(1, Math.cos(p.tilt)); // paper flipping in the air
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        }
        ctx.restore();
      }
      if (elapsed < 5000) raf = requestAnimationFrame(frame);
      else setDone(true);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", resize);
    };
  }, [id]);

  if (done) return null;
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" aria-hidden />;
}
