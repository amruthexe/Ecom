"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/**
 * Slide-in panel (mobile nav, admin nav, filters). Closes on Escape and backdrop click; locks body scroll.
 *
 * Rendered through a portal into <body>: the sticky header uses `backdrop-blur`, and `backdrop-filter`
 * makes an element the containing block for `position: fixed` children — without the portal the panel
 * would be clipped to the header's height.
 */
export function Sheet({
  open,
  onClose,
  title,
  heading,
  footer,
  side = "left",
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name (also shown when no `heading` is given). */
  title: string;
  /** Optional custom header content (e.g. the logo) shown instead of the title text. */
  heading?: ReactNode;
  /** Optional content pinned to the bottom of the panel. */
  footer?: ReactNode;
  side?: "left" | "right";
  children: ReactNode;
}) {
  const titleId = useId();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!hydrated) return null;
  const offset = side === "left" ? "-100%" : "100%";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "absolute top-0 flex h-dvh w-[86%] max-w-sm flex-col border-border bg-surface shadow-2xl shadow-black",
              side === "left" ? "left-0 border-r" : "right-0 border-l",
            )}
            initial={{ x: offset }}
            animate={{ x: 0 }}
            exit={{ x: offset }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              {heading ? (
                <>
                  <h2 id={titleId} className="sr-only">
                    {title}
                  </h2>
                  {heading}
                </>
              ) : (
                <h2 id={titleId} className="font-display text-lg font-semibold text-fg-strong">
                  {title}
                </h2>
              )}
              <button onClick={onClose} className="-mr-1 rounded-full p-2 text-fg hover:bg-surface-2 hover:text-fg-strong" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
            {footer && <div className="shrink-0 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
