import type { Metadata } from "next";
import { Package } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Container, EmptyState, Skeleton } from "@/components/ui/layout";
import { OrderView } from "@/components/store/order-view";
import { getGuestOrder } from "@/server/services/customer-orders";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  return (
    <Container className="py-10 sm:py-14">
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight text-fg-strong">Your order</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Content({ params, searchParams }: Pick<PageProps<"/orders/[id]">, "params" | "searchParams">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await getGuestOrder(id, first(sp.t));
  if (!order)
    return (
      <EmptyState
        icon={<Package className="size-10" />}
        title="Order not found"
        description="Use the link from your order confirmation."
        action={
          <Link href="/" className={buttonClasses("secondary")}>
            Go home
          </Link>
        }
      />
    );
  return (
    <>
      {first(sp.check) && order.paymentStatus !== "paid" && (
        <p className="mb-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          We&apos;re still confirming your payment with Razorpay. Refresh in a minute — you won&apos;t be charged twice.
        </p>
      )}
      <OrderView order={order} />
    </>
  );
}
