import type { Metadata } from "next";
import { Container } from "@/components/ui/layout";
import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="py-10 sm:py-14">
      <h1 className="mb-8 font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">Your cart</h1>
      <CartView />
    </Container>
  );
}
