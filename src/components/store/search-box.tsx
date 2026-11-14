"use client";

import { Search, Tag, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchSuggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Search input with debounced suggestions. Works without JS as a plain GET form to /products. */
export function SearchBox({ className, autoFocus, onNavigate }: { className?: string; autoFocus?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data: { suggestions: SearchSuggestion[] } = await res.json();
        setItems(data.suggestions);
        setActive(-1);
        setOpen(true);
      } catch {
        /* aborted or offline */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const visible = open && q.trim().length >= 2;

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  return (
    <form
      ref={boxRef}
      action="/products"
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && items[active]) return go(items[active].href);
        const term = q.trim();
        go(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted" />
      <input
        name="q"
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          if (e.target.value.trim().length < 2) setItems([]);
        }}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (!visible || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          }
        }}
        placeholder="Search products"
        role="combobox"
        aria-label="Search products"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={visible}
        autoComplete="off"
        className="h-10 w-full rounded-md border border-border bg-surface pr-3 pl-9 text-sm text-fg-strong placeholder:text-fg-muted/70 hover:border-border-strong focus:border-accent focus:outline-none"
      />
      {visible && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-md border border-border bg-surface shadow-lg shadow-black/40"
        >
          {items.length === 0 ? (
            <li className="px-3 py-3 text-sm text-fg-muted">No matches for &ldquo;{q.trim()}&rdquo;</li>
          ) : (
            items.map((s, i) => (
              <li key={s.href} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(s.href)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm",
                    i === active ? "bg-surface-2 text-fg-strong" : "text-fg",
                  )}
                >
                  {s.type === "category" ? <Tag className="size-4 text-fg-muted" /> : <Package className="size-4 text-fg-muted" />}
                  <span className="truncate">{s.label}</span>
                  {s.type === "category" && <span className="ml-auto text-xs text-fg-muted">Category</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </form>
  );
}
