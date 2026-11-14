import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, className }: { title?: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface p-4 sm:p-5", className)}>
      {title && (
        <header className="mb-4">
          <h2 className="font-display text-base font-semibold text-fg-strong">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, htmlFor, error, hint, children, className }: { label: string; htmlFor?: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm text-fg">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

export function Alert({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 flex items-start gap-2 rounded-md border px-4 py-3 text-sm",
        tone === "success" ? "border-accent/40 bg-accent/10 text-fg-strong" : "border-danger/40 bg-danger/10 text-danger",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: "draft" | "active" | "archived" }) {
  const styles = {
    active: "border-accent/40 bg-accent/10 text-fg-strong",
    draft: "border-warning/40 bg-warning/10 text-warning",
    archived: "border-border bg-surface-2 text-fg-muted",
  } as const;
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", styles[status])}>{status}</span>;
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="text-xs font-medium text-danger">Out of stock</span>;
  if (stock <= 5) return <span className="text-xs font-medium text-warning">{stock} left</span>;
  return <span className="text-xs text-fg-muted">{stock} in stock</span>;
}

/** Base classes for admin text inputs. Larger touch target on mobile. */
export const inputCls =
  "h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg-strong placeholder:text-fg-muted/60 transition-colors hover:border-border-strong focus:border-accent focus:outline-none sm:h-10 sm:text-sm aria-[invalid=true]:border-danger";
