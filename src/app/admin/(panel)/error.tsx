"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

/** Admin error screen (e.g. database briefly unreachable). Keeps the dark theme and offers a retry. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <AlertTriangle className="size-10 text-warning" />
      <h1 className="mt-4 font-display text-2xl font-semibold text-fg-strong">Couldn&apos;t load this page</h1>
      <p className="mt-2 text-sm text-fg-muted">
        This is usually a brief connection problem with the database. Your data is safe — try again in a few seconds.
      </p>
      <button onClick={reset} className="mt-6 flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-medium text-accent-contrast hover:bg-accent-hover">
        <RotateCw className="size-4" /> Try again
      </button>
      {error.digest && <p className="mt-4 font-mono text-xs text-fg-muted">Ref: {error.digest}</p>}
    </div>
  );
}
