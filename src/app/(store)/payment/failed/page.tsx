import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Container, Skeleton } from "@/components/ui/layout";
import { getGuestOrder } from "@/server/services/customer-orders";

export const metadata: Metadata = { title: "Payment failed", robots: { index: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function PaymentFailedPage({ searchParams }: PageProps<"/payment/failed">) {
  return (
    <Container className="flex flex-col items-center py-16 text-center sm:py-24">
      <XCircle className="size-14 text-danger" />
      <h1 className="mt-4 font-display text-3xl font-semibold text-fg-strong">Payment didn&apos;t go through</h1>
      <Suspense fallback={<Skeleton className="mt-3 h-5 w-72" />}>
        <Detail searchParams={searchParams} />
      </Suspense>
      <p className="mt-3 max-w-md text-fg-muted">
        No money was taken. If it was deducted from your account, it will be refunded automatically by your bank within 5–7 days, or your order will be confirmed if the payment completes.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/checkout" className={buttonClasses("primary", "lg")}>
          Try again
        </Link>
        <Link href="/cart" className={buttonClasses("secondary", "lg")}>
          Back to cart
        </Link>
      </div>
      <p className="mt-6 text-sm text-fg-muted">Your cart has been kept. Try a different payment method such as UPI or another card.</p>
    </Container>
  );
}

async function Detail({ searchParams }: Pick<PageProps<"/payment/failed">, "searchParams">) {
  const sp = await searchParams;
  const order = await getGuestOrder(first(sp.order), first(sp.t));
  if (!order) return null;
  if (order.paymentStatus === "paid")
    return (
      <p className="mt-3 text-fg-strong">
        Good news — order {order.orderNumber} was actually paid.{" "}
        <Link href={`/orders/${order.id}?t=${first(sp.t)}`} className="underline">
          View order
        </Link>
      </p>
    );
  return <p className="mt-3 text-fg">Order {order.orderNumber} is waiting for payment.</p>;
}
