"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { adminSignInAction, type LoginState } from "@/server/actions/auth";
import { Alert, Field, inputCls } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(adminSignInAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} className={inputCls} />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
