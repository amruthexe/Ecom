import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/layout";
import { LoginForm } from "@/components/store/auth-forms";
import { safeNext } from "@/lib/validators/account";
import { getCustomer } from "@/server/customer";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/account/login">) {
  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-fg-strong">Log in</h1>
        <p className="mt-2 mb-6 text-sm text-fg-muted">Log in to place orders and see your orders on any device.</p>
        <div className="rounded-lg border border-border bg-surface p-5">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <Gate searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}

async function Gate({ searchParams }: Pick<PageProps<"/account/login">, "searchParams">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (await getCustomer()) redirect(next);
  return <LoginForm next={next} />;
}
