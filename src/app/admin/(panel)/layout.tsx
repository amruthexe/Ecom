import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/layout";
import { requireStaffPage } from "@/server/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Vevvion Admin" }, robots: { index: false, follow: false } };

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  return <AdminShell user={user}>{children}</AdminShell>;
}

function AdminLoading() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <div className="hidden border-r border-border bg-surface lg:block" />
      <div className="space-y-4 p-4 sm:p-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
