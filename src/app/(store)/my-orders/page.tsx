import type { Metadata } from "next";
import { ChevronRight, Package } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Container, EmptyState, Skeleton } from "@/components/ui/layout";
import { ProductMedia } from "@/components/store/product-media";
import { formatDate } from "@/lib/format";
import { formatPaise } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { requireCustomerPage } from "@/server/customer";
import { listMyOrders } from "@/server/services/account";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default function MyOrdersPage() {
  return (
    <Container className="py-10 sm:py-14">
      <h1 className="mb-8 font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">My orders</h1>
      <Suspense fallback={<Skeleton className="h-72" />}>
        <Orders />
      </Suspense>
    </Container>
  );
}

async function Orders() {
  const customer = await requireCustomerPage("/my-orders");
  const orders = await listMyOrders(customer.id);
  if (orders.length === 0)
    return (
      <EmptyState
        icon={<Package className="size-10" />}
        title="No orders yet"
        description="When you place an order, it shows up here on every device you log in to."
        action={
          <Link href="/products" className={buttonClasses("primary", "lg")}>
            Start shopping
          </Link>
        }
      />
    );
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/my-orders/${o.id}`} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong sm:p-4">
            <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-md border border-border sm:w-16">
              <ProductMedia image={o.imageUrl ? { url: o.imageUrl, alt: o.firstItem } : undefined} seed={o.slug} alt={o.firstItem} sizes="64px" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium text-fg-strong">{o.orderNumber}</span>
                <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] text-fg-strong">{ORDER_STATUS_LABEL[o.status]}</span>
              </span>
              <span className="mt-1 block truncate text-sm text-fg">
                {o.firstItem}
                {o.itemCount > 1 ? ` + ${o.itemCount - 1} more` : ""}
              </span>
              <span className="mt-0.5 block text-xs text-fg-muted">
                {formatDate(o.createdAt)} · {formatPaise(o.totalPaise)} · {PAYMENT_STATUS_LABEL[o.paymentStatus]}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-fg-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
