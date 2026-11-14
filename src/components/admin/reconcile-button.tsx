"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { reconcileOrderAction, type OrderActionState } from "@/server/actions/orders";
import { Alert, Panel } from "./ui";

/** For unpaid/failed orders: ask Razorpay whether the customer actually paid. */
export function ReconcileButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(reconcileOrderAction, {});
  return (
    <Panel title="Payment not confirmed" description="If the customer says they paid, check directly with Razorpay. Safe to press more than once.">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-accent/60 text-sm font-medium text-fg-strong hover:bg-accent/10 disabled:opacity-50 sm:w-auto sm:px-5">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Check payment with Razorpay
        </button>
      </form>
    </Panel>
  );
}
