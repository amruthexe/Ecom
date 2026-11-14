import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/layout";
import { CheckoutForm } from "@/components/store/checkout-form";
import { requireCustomerPage } from "@/server/customer";
import { listAddresses } from "@/server/services/account";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Container className="py-10 sm:py-14">
      <h1 className="mb-8 font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">Checkout</h1>
      <Suspense
        fallback={
          <div className="grid gap-8 lg:grid-cols-[1fr_400px]" aria-busy="true">
            <Skeleton className="h-96" />
            <Skeleton className="h-72" />
          </div>
        }
      >
        <SignedInCheckout />
      </Suspense>
    </Container>
  );
}

/** Customers must be signed in to order. Visitors are sent to login and brought back here. */
async function SignedInCheckout() {
  const customer = await requireCustomerPage("/checkout");
  const addresses = await listAddresses(customer.id);
  return <CheckoutForm customer={{ name: customer.name, email: customer.email, phone: customer.phone }} addresses={addresses} />;
}
