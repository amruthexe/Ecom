import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-lg bg-accent font-display text-xl font-bold text-accent-contrast">V</span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-fg-strong">Vevvion Admin</h1>
          <p className="mt-1 text-sm text-fg-muted">Sign in to manage your store</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
