import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/layout";
import { RegisterForm } from "@/components/store/auth-forms";
import { safeNext } from "@/lib/validators/account";
import { getCustomer } from "@/server/customer";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage({ searchParams }: PageProps<"/account/register">) {
  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-fg-strong">Create your account</h1>
        <p className="mt-2 mb-6 text-sm text-fg-muted">One account for ordering, saved addresses and tracking your orders from any device.</p>
        <div className="rounded-lg border border-border bg-surface p-5">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <Gate searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}

async function Gate({ searchParams }: Pick<PageProps<"/account/register">, "searchParams">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (await getCustomer()) redirect(next);
  return <RegisterForm next={next} />;
}
