"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <AlertTriangle className="size-10 text-warning" />
      <h1 className="mt-4 font-display text-2xl font-semibold text-fg-strong">Something went wrong</h1>
      <p className="mt-2 max-w-md text-fg-muted">We couldn&apos;t load this page. Please try again in a moment.</p>
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </Container>
  );
}
