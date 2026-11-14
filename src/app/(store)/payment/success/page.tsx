import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Container, EmptyState, Skeleton } from "@/components/ui/layout";
import { OrderView } from "@/components/store/order-view";
import { getGuestOrder } from "@/server/services/customer-orders";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function PaymentSuccessPage({ searchParams }: PageProps<"/payment/success">) {
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/payment/success">, "searchParams">) {
  const sp = await searchParams;
  const order = await getGuestOrder(first(sp.order), first(sp.t));
  if (!order) return <EmptyState title="Order not found" description="This link is invalid or has expired." action={<Link href="/" className={buttonClasses("secondary")}>Go home</Link>} />;
  const paid = order.paymentStatus === "paid";
  const orderLink = `/orders/${order.id}?t=${first(sp.t)}`;
  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center">
        <CheckCircle2 className="size-14 text-accent" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-fg-strong">{paid ? "Thank you! Your order is confirmed" : "We're confirming your payment"}</h1>
        <p className="mt-2 max-w-md text-fg-muted">
          {paid
            ? `Order ${order.orderNumber} is paid. Bookmark this page or use "Track this order" to follow its progress.`
            : "This usually takes less than a minute. Refresh this page shortly."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={orderLink} className={buttonClasses("primary")}>
            Track this order
          </Link>
          <Link href="/products" className={buttonClasses("secondary")}>
            Continue shopping
          </Link>
        </div>
      </div>
      <OrderView order={order} />
    </>
  );
}
