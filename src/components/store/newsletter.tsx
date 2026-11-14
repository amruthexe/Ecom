"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Newsletter form. Phase 2: UI only — sign-ups are NOT stored yet (wired to a server action in Phase 11).
 * The confirmation message says so honestly.
 */
export function NewsletterForm() {
  const [done, setDone] = useState(false);
  if (done)
    return (
      <p className="flex items-center gap-2 text-sm text-fg-strong" role="status">
        <Check className="size-4" /> Thank you! Our newsletter launches soon — we&apos;ll keep you posted.
      </p>
    );
  return (
    <form
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="you@example.com"
        className="h-11 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-fg-strong placeholder:text-fg-muted/70 focus:border-accent focus:outline-none"
      />
      <Button type="submit" size="lg" className="h-11">
        Subscribe
      </Button>
    </form>
  );
}
