import { AlertTriangle, PackageOpen } from "lucide-react";
import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import type { getSalesOverview } from "@/server/services/sales";
import { OrderStatusBadge } from "./order-badges";
import { Panel } from "./ui";

type Overview = Awaited<ReturnType<typeof getSalesOverview>>;

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export function SalesOverview({ data }: { data: Overview }) {
  const max = Math.max(...data.series.map((d) => d.revenuePaise), 1);
  return (
    <section className="mb-5 space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Money label="Revenue today" paise={data.today.revenue} sub={`${data.today.orders} order${data.today.orders === 1 ? "" : "s"}`} />
        <Money label="Last 7 days" paise={data.week.revenue} sub={`${data.week.orders} orders`} />
        <Money label="Last 14 days" paise={data.period.revenue} sub={`${data.period.orders} orders`} />
        <Link href="/admin/orders?filter=to_fulfil" className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong">
          <p className="flex items-center gap-2 text-xs text-fg-muted">
            <PackageOpen className="size-4" /> To pack & ship
          </p>
          <p className={`mt-2 font-display text-3xl font-semibold tabular-nums ${data.toFulfil ? "text-warning" : "text-fg-strong"}`}>{data.toFulfil}</p>
          <p className="mt-1 text-xs text-fg-muted">Paid orders waiting</p>
        </Link>
      </div>

      {data.attention > 0 && (
        <Link href="/admin/orders?filter=attention" className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="size-4" /> {data.attention} order{data.attention === 1 ? " needs" : "s need"} your attention
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Revenue, last 14 days" description="Net of refunds · India time">
          <div className="flex h-40 items-end gap-1" role="img" aria-label="Daily revenue bar chart">
            {data.series.map((d) => (
              <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-t-sm bg-accent/80 transition-colors group-hover:bg-accent"
                  style={{ height: `${Math.max((d.revenuePaise / max) * 100, d.revenuePaise ? 3 : 1)}%`, opacity: d.revenuePaise ? 1 : 0.25 }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded border border-border bg-bg px-2 py-1 text-[11px] whitespace-nowrap text-fg-strong group-hover:block">
                  {dayLabel.format(new Date(d.date))}: {formatPaise(d.revenuePaise)} · {d.orders}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-fg-muted">
            <span>{dayLabel.format(new Date(data.series[0].date))}</span>
            <span>Today</span>
          </div>
        </Panel>
        <Panel title="Recent orders">
          {data.recent.length === 0 ? (
            <p className="text-sm text-fg-muted">No orders yet. They appear here as soon as customers pay.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-fg-strong">
                        {o.orderNumber} · {o.customer}
                      </span>
                      <span className="text-xs text-fg-muted">{formatDateTime(o.createdAt)}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm text-fg-strong tabular-nums">{formatPaise(o.totalPaise)}</span>
                      <OrderStatusBadge status={o.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}

function Money({ label, paise, sub }: { label: string; paise: number; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-fg-strong tabular-nums sm:text-3xl">{formatPaise(paise)}</p>
      <p className="mt-1 text-xs text-fg-muted">{sub}</p>
    </div>
  );
}
