import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, Package } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Container, EmptyState, Skeleton } from "@/components/ui/layout";
import { OrderView } from "@/components/store/order-view";
import { requireCustomerPage } from "@/server/customer";
import { getMyOrder } from "@/server/services/customer-orders";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default function MyOrderPage({ params, searchParams }: PageProps<"/my-orders/[id]">) {
  return (
    <Container className="py-10 sm:py-14">
      <Link href="/my-orders" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg-strong">
        <ArrowLeft className="size-4" /> My orders
      </Link>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Content({ params, searchParams }: Pick<PageProps<"/my-orders/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const customer = await requireCustomerPage(`/my-orders/${id}`);
  const [order, sp] = await Promise.all([getMyOrder(customer.id, id), searchParams]);
  if (!order)
    return (
      <EmptyState
        icon={<Package className="size-10" />}
        title="Order not found"
        description="This order isn't in your account."
        action={
          <Link href="/my-orders" className={buttonClasses("secondary")}>
            See my orders
          </Link>
        }
      />
    );
  const paid = order.paymentStatus === "paid";
  return (
    <>
      {sp.placed && paid && (
        <div className="mb-8 flex flex-col items-center rounded-lg border border-accent/40 bg-accent/10 p-6 text-center">
          <CheckCircle2 className="size-12 text-accent" />
          <h1 className="mt-3 font-display text-2xl font-semibold text-fg-strong">Thank you! Your order is confirmed</h1>
          <p className="mt-1 text-sm text-fg">You can see this order anytime under My orders, on any device you log in to.</p>
        </div>
      )}
      {!paid && order.paymentStatus === "pending" && (sp.check || sp.placed) && (
        <p className="mb-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          We&apos;re still confirming your payment with Razorpay. Refresh in a minute — you won&apos;t be charged twice.
        </p>
      )}
      {!sp.placed && <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight text-fg-strong">Order {order.orderNumber}</h1>}
      <OrderView order={order} />
    </>
  );
}
