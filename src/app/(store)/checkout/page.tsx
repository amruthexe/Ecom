import type { Metadata } from "next";
import { Container } from "@/components/ui/layout";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Container className="py-10 sm:py-14">
      <h1 className="mb-8 font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">Checkout</h1>
      <CheckoutForm />
    </Container>
  );
}
