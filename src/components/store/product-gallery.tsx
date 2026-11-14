"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductMedia } from "./product-media";

/** Main image + thumbnails. When a product has no uploads, shows three generated frames. */
export function ProductGallery({ images, seed, name }: { images: ProductImage[]; seed: string; name: string }) {
  const frames = images.length
    ? images.map((img, i) => ({ key: img.url, image: img, seed: `${seed}-${i}` }))
    : [0, 1, 2].map((i) => ({ key: `art-${i}`, image: undefined, seed: i === 0 ? seed : `${seed}-${i}` }));
  const [index, setIndex] = useState(0);
  const current = frames[index];
  const step = (d: number) => setIndex((i) => (i + d + frames.length) % frames.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-border bg-surface">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={current.key}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ProductMedia image={current.image} seed={current.seed} alt={`${name}, image ${index + 1}`} sizes="(min-width: 1024px) 50vw, 100vw" priority={index === 0} />
          </motion.div>
        </AnimatePresence>
        {frames.length > 1 && (
          <>
            <GalleryArrow side="left" onClick={() => step(-1)} />
            <GalleryArrow side="right" onClick={() => step(1)} />
          </>
        )}
      </div>
      {frames.length > 1 && (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {frames.map((f, i) => (
            <button
              key={f.key}
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border transition-colors",
                i === index ? "border-accent" : "border-border hover:border-border-strong",
              )}
            >
              <ProductMedia image={f.image} seed={f.seed} alt="" sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Previous image" : "Next image"}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 rounded-full border border-border bg-bg/70 p-2 text-fg-strong backdrop-blur hover:border-accent",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
