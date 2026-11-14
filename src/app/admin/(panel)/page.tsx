import { AlertTriangle, FolderTree, Package, PackageX, Plus } from "lucide-react";
import Link from "next/link";
import { Alert, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { formatPaise } from "@/lib/money";
import { requireStaffPage } from "@/server/auth";
import { getDashboardStats } from "@/server/services/products";
import { getSalesOverview } from "@/server/services/sales";
import { SalesOverview } from "@/components/admin/sales-overview";

// Admin pages always check the signed-in user on the server before rendering, so they block by design.
export const instant = false;

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const user = await requireStaffPage();
  const { denied } = await searchParams;
  const canProducts = hasPermission(user, "products");
  const canOrders = hasPermission(user, "orders");
  const [stats, sales] = await Promise.all([canProducts ? getDashboardStats() : null, canOrders ? getSalesOverview(14) : null]);

  return (
    <>
      <PageHeader
        title={`Hi, ${user.name.split(" ")[0]}`}
        description="Here's how your store is doing today."
        actions={
          canProducts && (
            <Link href="/admin/products/new" className={buttonClasses("primary", "md", "hidden lg:inline-flex")}>
              <Plus className="size-4" /> Add product
            </Link>
          )
        }
      />
      {denied && <Alert tone="error">You don&apos;t have access to that section.</Alert>}
      {sales && <SalesOverview data={sales} />}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat href="/admin/products" icon={<Package className="size-4" />} label="Products" value={stats.total} sub={`${stats.active} live · ${stats.draft} draft`} />
            <Stat href="/admin/categories" icon={<FolderTree className="size-4" />} label="Categories" value={stats.categories} />
            <Stat href="/admin/products?stock=low" icon={<AlertTriangle className="size-4" />} label="Low stock" value={stats.lowStock} tone={stats.lowStock ? "warning" : undefined} />
            <Stat href="/admin/products?stock=out" icon={<PackageX className="size-4" />} label="Out of stock" value={stats.outOfStock} tone={stats.outOfStock ? "danger" : undefined} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Needs restocking" description="5 or fewer left">
              {stats.lowStockItems.length === 0 ? (
                <p className="text-sm text-fg-muted">All products are well stocked.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.lowStockItems.map((p) => (
                    <li key={p.id}>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-fg-strong">
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-fg-strong">{p.name}</span>
                          <span className="text-xs text-fg-muted">{p.sku}</span>
                        </span>
                        <span className={p.stock === 0 ? "text-sm font-medium text-danger" : "text-sm font-medium text-warning"}>{p.stock === 0 ? "Out" : `${p.stock} left`}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Recently updated">
              <ul className="divide-y divide-border">
                {stats.recent.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0 truncate text-sm text-fg-strong">{p.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-sm text-fg tabular-nums">{formatPaise(p.pricePaise)}</span>
                        <StatusBadge status={p.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

function Stat({ href, icon, label, value, sub, tone }: { href: string; icon: React.ReactNode; label: string; value: number; sub?: string; tone?: "warning" | "danger" }) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        {icon} {label}
      </p>
      <p className={`mt-2 font-display text-3xl font-semibold tabular-nums ${tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-fg-strong"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
    </Link>
  );
}
