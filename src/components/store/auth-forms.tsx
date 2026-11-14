"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { cn } from "@/lib/utils";
import { loginAction, registerAction, type AccountState } from "@/server/actions/account";

export const fieldCls = (error?: string) =>
  cn(
    "h-11 w-full rounded-md border bg-bg px-3 text-base text-fg-strong placeholder:text-fg-muted/60 focus:border-accent focus:outline-none sm:text-sm",
    error ? "border-danger" : "border-border hover:border-border-strong",
  );

export function Field({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-fg">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50">
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(loginAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormError message={e._form} />
      <Field label="Email" id="email" error={e.email}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} className={fieldCls(e.email)} />
      </Field>
      <Field label="Password" id="password" error={e.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" className={fieldCls(e.password)} />
      </Field>
      <SubmitButton pending={pending}>Log in</SubmitButton>
      <p className="text-center text-sm text-fg-muted">
        New to Vevvion?{" "}
        <Link href={`/account/register?next=${encodeURIComponent(next)}`} className="font-medium text-fg-strong underline">
          Create an account
        </Link>
      </p>
      <p className="text-center text-xs text-fg-muted">Forgot your password? Contact the store and we&apos;ll reset it for you.</p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(registerAction, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormError message={e._form} />
      <Field label="Full name" id="name" error={e.name}>
        <input id="name" name="name" autoComplete="name" defaultValue={v.name} className={fieldCls(e.name)} />
      </Field>
      <Field label="Email" id="email" error={e.email}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} className={fieldCls(e.email)} />
      </Field>
      <Field label="Mobile number" id="phone" error={e.phone}>
        <input id="phone" name="phone" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="98765 43210" defaultValue={v.phone} className={fieldCls(e.phone)} />
      </Field>
      <Field label="Password" id="password" error={e.password} hint="At least 8 characters">
        <input id="password" name="password" type="password" autoComplete="new-password" className={fieldCls(e.password)} />
      </Field>
      <Field label="Confirm password" id="confirm" error={e.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className={fieldCls(e.confirm)} />
      </Field>
      <SubmitButton pending={pending}>Create account</SubmitButton>
      <p className="text-center text-sm text-fg-muted">
        Already have an account?{" "}
        <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="font-medium text-fg-strong underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
