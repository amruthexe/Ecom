import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Package, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Alert, PageHeader, StatusBadge, StockBadge, inputCls } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { ProductArt } from "@/components/store/product-art";
import { formatPaise } from "@/lib/money";
import type { ProductStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/server/auth";
import { listAdminProducts, type AdminProductRow } from "@/server/services/products";

export const metadata: Metadata = { title: "Products" };

const TABS: { value: ProductStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaffPage("products");
  const sp = await searchParams;
  const q = first(sp.q)?.trim().slice(0, 80) || undefined;
  const statusParam = first(sp.status);
  const status = TABS.some((t) => t.value === statusParam) ? (statusParam as ProductStatus | "all") : "all";
  const stockParam = first(sp.stock);
  const stock = stockParam === "low" || stockParam === "out" ? stockParam : undefined;
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const { rows, total, pages } = await listAdminProducts({ q, status, stock, page });

  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, status: status === "all" ? undefined : status, stock, page: undefined, ...over };
    Object.entries(merged).forEach(([k, v]) => v !== undefined && v !== "" && p.set(k, String(v)));
    const s = p.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        actions={
          <Link href="/admin/products/new" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" /> Add product
          </Link>
        }
      />
      {first(sp.deleted) && <Alert tone="success">Product deleted.</Alert>}

      <form action="/admin/products" className="relative mb-4">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted" />
        <input name="q" type="search" defaultValue={q} placeholder="Search name, SKU or tag" className={cn(inputCls, "pl-9")} aria-label="Search products" />
      </form>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Chip key={t.value} href={href({ status: t.value === "all" ? undefined : t.value, stock: undefined })} active={status === t.value && !stock}>
            {t.label}
          </Chip>
        ))}
        <Chip href={href({ stock: "low", status: undefined })} active={stock === "low"}>
          Low stock
        </Chip>
        <Chip href={href({ stock: "out", status: undefined })} active={stock === "out"}>
          Out of stock
        </Chip>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Package className="size-10" />}
          title={q || stock || status !== "all" ? "No products match" : "No products yet"}
          description={q ? "Try a different search." : "Add your first product to start selling."}
          action={
            <Link href="/admin/products/new" className={buttonClasses("primary")}>
              <Plus className="size-4" /> Add product
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-2 md:hidden">
            {rows.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex gap-3 rounded-lg border border-border bg-surface p-3 active:bg-surface-2">
                  <Thumb row={p} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-fg-strong">{p.name}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">
                      {p.sku} · {p.categoryName}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <PriceCell row={p} />
                      <StockBadge stock={p.totalStock} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-surface">
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <Thumb row={p} small />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg-strong hover:underline">{p.name}</span>
                          <span className="text-xs text-fg-muted">
                            {p.sku}
                            {p.variantCount > 0 && ` · ${p.variantCount} variants`}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{p.categoryName}</td>
                    <td className="px-4 py-3">
                      <PriceCell row={p} />
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge stock={p.totalStock} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
              <Link href={href({ page: page - 1 })} aria-disabled={page <= 1} className={cn(buttonClasses("secondary", "sm"), page <= 1 && "pointer-events-none opacity-40")}>
                <ChevronLeft className="size-4" /> Prev
              </Link>
              <span className="text-sm text-fg-muted">
                Page {page} of {pages}
              </span>
              <Link href={href({ page: page + 1 })} aria-disabled={page >= pages} className={cn(buttonClasses("secondary", "sm"), page >= pages && "pointer-events-none opacity-40")}>
                Next <ChevronRight className="size-4" />
              </Link>
            </nav>
          )}
        </>
      )}
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap",
        active ? "border-accent bg-accent/15 text-fg-strong" : "border-border text-fg-muted hover:border-border-strong",
      )}
    >
      {children}
    </Link>
  );
}

function Thumb({ row, small }: { row: AdminProductRow; small?: boolean }) {
  return (
    <span className={cn("relative shrink-0 overflow-hidden rounded-md border border-border", small ? "size-10" : "size-16")}>
      {row.imageUrl ? <Image src={row.imageUrl} alt="" fill sizes="64px" className="object-cover" /> : <ProductArt seed={row.slug} />}
    </span>
  );
}

function PriceCell({ row }: { row: AdminProductRow }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-medium text-fg-strong tabular-nums">{formatPaise(row.pricePaise)}</span>
      {row.discountPercent > 0 && <span className="text-xs text-accent">−{row.discountPercent}%</span>}
    </span>
  );
}
