"use client";

import { AlertTriangle, Loader2, Lock, ShieldCheck, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { formatPaise } from "@/lib/money";
import { INDIAN_STATES } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { cartStore, useCart, type CartLine } from "./cart-store";
import { ProductMedia } from "./product-media";

type QuoteLine = { productId: string; variantId?: string; name: string; slug: string; options?: string; imageUrl?: string; unitMrpPaise: number; unitPricePaise: number; qty: number; lineTotalPaise: number; available: number };
type Problem = { productId: string; variantId?: string; message: string; available: number };
type Quote = { lines: QuoteLine[]; problems: Problem[]; mrpTotalPaise: number; subtotalPaise: number; shippingPaise: number; totalPaise: number; gstPaise: number; gstRatePercent: number };

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayFailure = { error: { code?: string; description?: string; metadata?: { payment_id?: string; order_id?: string } } };
type RazorpayInstance = { open: () => void; on: (event: "payment.failed", cb: (r: RazorpayFailure) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const newKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 40);

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const toItems = (lines: CartLine[]) => lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty }));
const lineKey = (p: { productId: string; variantId?: string }) => `${p.productId}:${p.variantId ?? "-"}`;

type Details = { name: string; email: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string };
const EMPTY: Details = { name: "", email: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "" };

export type CheckoutCustomer = { name: string; email: string; phone: string };
export type CheckoutAddress = { id: string; name: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string; isDefault: boolean };

function fromAddress(customer: CheckoutCustomer, a?: CheckoutAddress): Details {
  if (!a) return { ...EMPTY, name: customer.name, email: customer.email, phone: customer.phone };
  return { name: a.name, email: customer.email, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode };
}

const noopSubscribe = () => () => {};
/** false during SSR/hydration, true after — avoids flashing "empty cart" before localStorage is read. */
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

export function CheckoutForm({ customer, addresses }: { customer: CheckoutCustomer; addresses: CheckoutAddress[] }) {
  const router = useRouter();
  const cart = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string>();
  const hydrated = useHydrated();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "new");
  const [saveAddress, setSaveAddress] = useState(true);
  const [d, setD] = useState<Details>(() => fromAddress(customer, defaultAddress));
  const chooseAddress = (id: string) => {
    setAddressId(id);
    setErrors({});
    setD(fromAddress(customer, addresses.find((a) => a.id === id)));
  };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [phase, setPhase] = useState<"idle" | "creating" | "paying" | "verifying">("idle");
  // One key per checkout attempt (created on first Pay click) so double clicks never create two orders.
  const idemKey = useRef<string | null>(null);

  const itemsJson = useMemo(() => JSON.stringify(toItems(cart)), [cart]);
  useEffect(() => {
    if (cart.length === 0) return;
    // Ignore stale responses instead of aborting: React dev mode runs effects twice, and an aborted
    // fetch surfaces as an "AbortError" in the Next.js dev overlay.
    let stale = false;
    fetch("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: JSON.parse(itemsJson) }) })
      .then(async (r) => {
        const data = r.ok ? await r.json() : null;
        if (stale) return;
        if (data) setQuote(data);
        else setQuoteError("Couldn't load prices. Please refresh.");
      })
      .catch(() => {
        if (!stale) setQuoteError("Couldn't load prices. Check your connection and refresh.");
      });
    return () => {
      stale = true;
    };
  }, [itemsJson, cart.length]);

  const fixCart = useCallback(() => {
    if (!quote) return;
    for (const p of quote.problems) {
      const line = cart.find((l) => lineKey(l) === lineKey(p));
      if (!line) continue;
      if (p.available > 0) cartStore.setQty(line.key, p.available);
      else cartStore.remove(line.key);
    }
  }, [quote, cart]);

  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD((x) => ({ ...x, [k]: e.target.value }));

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "idle") return;
    setErrors({});
    setMessage(undefined);
    setPhase("creating");

    const [ok, res] = await Promise.all([
      loadRazorpay(),
      fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: toItems(cart),
          contact: { name: d.name, email: d.email, phone: d.phone },
          address: { line1: d.line1, line2: d.line2, landmark: d.landmark, city: d.city, state: d.state, pincode: d.pincode },
          idempotencyKey: (idemKey.current ??= newKey()),
          saveAddress: addressId === "new" && saveAddress,
        }),
      }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) })),
    ]);

    const data = res.data;
    if (res.status === 401 && data.loginRequired) {
      router.push("/account/login?next=/checkout");
      return;
    }
    if (!data.ok) {
      setPhase("idle");
      if (data.errors) setErrors(data.errors);
      if (data.problems) setQuote((q) => (q ? { ...q, problems: data.problems } : q));
      setMessage(data.message ?? (data.errors ? "Please check the highlighted fields." : "Something went wrong. You have not been charged."));
      if (res.status !== 422) idemKey.current = null;
      return;
    }
    if (!ok || !window.Razorpay) {
      setPhase("idle");
      setMessage("Couldn't load Razorpay. Check your connection and try again.");
      return;
    }

    setPhase("paying");
    const failedUrl = `/payment/failed?order=${data.orderId}&t=${data.token}`;
    let failed = false;
    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: data.amountPaise,
      currency: "INR",
      order_id: data.razorpayOrderId,
      name: "Vevvion",
      description: `Order ${data.orderNumber}`,
      image: `${window.location.origin}/brand/logo-mark-256.png`,
      prefill: data.prefill,
      notes: { orderNumber: data.orderNumber },
      theme: { color: "#8ac504", backdrop_color: "#0a0a0a" },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          if (failed) router.push(failedUrl);
          else {
            setPhase("idle");
            setMessage("Payment cancelled. You can try again — you have not been charged.");
          }
        },
      },
      handler: async (resp: RazorpayResponse) => {
        setPhase("verifying");
        const v = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) })
          .then((r) => r.json())
          .catch(() => ({ ok: false }));
        cartStore.clear();
        // Even if verification is slow, the webhook confirms the order; the order page shows live status.
        router.replace(v.ok ? `/my-orders/${v.orderId}?placed=1` : `/my-orders/${data.orderId}?check=1`);
      },
    });
    rzp.on("payment.failed", (r) => {
      failed = true;
      fetch("/api/payments/failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ razorpayOrderId: data.razorpayOrderId, paymentId: r.error.metadata?.payment_id, code: r.error.code, description: r.error.description?.slice(0, 300) }),
      }).catch(() => {});
    });
    rzp.open();
  }

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]" aria-busy="true">
        <div className="h-96 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-72 animate-pulse rounded-lg bg-surface-2" />
      </div>
    );
  }

  if (cart.length === 0 && phase === "idle") {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-10" />}
        title="Your cart is empty"
        description="Add something to your cart to check out."
        action={
          <Link href="/products" className={buttonClasses("primary", "lg")}>
            Continue shopping
          </Link>
        }
      />
    );
  }

  const problemFor = (l: QuoteLine) => quote?.problems.find((p) => lineKey(p) === lineKey(l));
  const blocked = !quote || quote.problems.length > 0;
  const busy = phase !== "idle";

  return (
    <form onSubmit={pay} noValidate className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <Section title="Delivery address">
          {addresses.length > 0 && (
            <div className="mb-4 grid gap-2" role="radiogroup" aria-label="Choose a delivery address">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors",
                    addressId === a.id ? "border-accent bg-accent/10" : "border-border hover:border-border-strong",
                  )}
                >
                  <input type="radio" name="addressChoice" checked={addressId === a.id} onChange={() => chooseAddress(a.id)} className="mt-1 size-4 accent-[var(--accent)]" />
                  <span className="min-w-0">
                    <span className="block font-medium text-fg-strong">
                      {a.name} · {a.phone}
                      {a.isDefault && <span className="ml-2 rounded-full border border-accent/40 px-1.5 text-[10px] text-fg">Default</span>}
                    </span>
                    <span className="block text-fg-muted">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                    </span>
                  </span>
                </label>
              ))}
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm", addressId === "new" ? "border-accent bg-accent/10" : "border-border hover:border-border-strong")}>
                <input type="radio" name="addressChoice" checked={addressId === "new"} onChange={() => chooseAddress("new")} className="size-4 accent-[var(--accent)]" />
                <span className="font-medium text-fg-strong">Use a new address</span>
              </label>
            </div>
          )}
          {(errors["contact.name"] || errors["contact.phone"] || Object.keys(errors).some((k) => k.startsWith("address."))) && addressId !== "new" && (
            <p className="mb-3 text-sm text-danger">This saved address is incomplete. Choose “Use a new address” and enter it again.</p>
          )}
          {addressId === "new" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Recipient name" id="name" error={errors["contact.name"]}>
                <input id="name" autoComplete="name" value={d.name} onChange={set("name")} className={inp(errors["contact.name"])} />
              </F>
              <F label="Mobile number" id="phone" error={errors["contact.phone"]}>
                <input id="phone" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="98765 43210" value={d.phone} onChange={set("phone")} className={inp(errors["contact.phone"])} />
              </F>
              <F label="House / flat, building, street" id="line1" error={errors["address.line1"]} className="sm:col-span-2">
                <input id="line1" autoComplete="address-line1" value={d.line1} onChange={set("line1")} className={inp(errors["address.line1"])} />
              </F>
              <F label="Area / locality (optional)" id="line2" className="sm:col-span-2">
                <input id="line2" autoComplete="address-line2" value={d.line2} onChange={set("line2")} className={inp()} />
              </F>
              <F label="Landmark (optional)" id="landmark">
                <input id="landmark" value={d.landmark} onChange={set("landmark")} className={inp()} />
              </F>
              <F label="PIN code" id="pincode" error={errors["address.pincode"]}>
                <input id="pincode" autoComplete="postal-code" inputMode="numeric" maxLength={6} value={d.pincode} onChange={(e) => setD((x) => ({ ...x, pincode: e.target.value.replace(/D/g, "") }))} className={inp(errors["address.pincode"])} />
              </F>
              <F label="City" id="city" error={errors["address.city"]}>
                <input id="city" autoComplete="address-level2" value={d.city} onChange={set("city")} className={inp(errors["address.city"])} />
              </F>
              <F label="State" id="state" error={errors["address.state"]}>
                <select id="state" autoComplete="address-level1" value={d.state} onChange={set("state")} className={inp(errors["address.state"])}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </F>
              <label className="flex items-center gap-2 text-sm text-fg sm:col-span-2">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="size-4 accent-[var(--accent)]" />
                Save this address to my account
              </label>
            </div>
          )}
          <p className="mt-4 text-xs text-fg-muted">
            Order updates go to <span className="text-fg">{customer.email}</span>
          </p>
        </Section>

        <Section title="Payment">
          <p className="flex items-start gap-2 text-sm text-fg-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            Pay securely with UPI, cards, netbanking or wallets through Razorpay. We never see or store your card details.
          </p>
        </Section>
      </div>

      <aside className="h-fit rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-28">
        <h2 className="font-display text-lg font-semibold text-fg-strong">Order summary</h2>
        {quoteError && <p className="mt-3 text-sm text-danger">{quoteError}</p>}
        {!quote ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-fg-muted">
            <Loader2 className="size-4 animate-spin" /> Checking prices and stock…
          </div>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-border">
              {quote.lines.map((l) => {
                const problem = problemFor(l);
                return (
                  <li key={lineKey(l)} className="flex gap-3 py-3">
                    <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-md border border-border">
                      <ProductMedia image={l.imageUrl ? { url: l.imageUrl, alt: l.name } : undefined} seed={l.slug} alt={l.name} sizes="56px" />
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="line-clamp-2 text-fg-strong">{l.name}</p>
                      <p className="text-xs text-fg-muted">
                        {l.options ? `${l.options} · ` : ""}Qty {l.qty}
                      </p>
                      {problem && <p className="mt-0.5 text-xs text-danger">{problem.message}</p>}
                    </div>
                    <p className="text-sm text-fg-strong tabular-nums">{formatPaise(l.lineTotalPaise)}</p>
                  </li>
                );
              })}
            </ul>
            {quote.problems.length > 0 && (
              <div className="mt-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                <p className="flex items-center gap-2">
                  <AlertTriangle className="size-4" /> Some items changed since you added them.
                </p>
                <button type="button" onClick={fixCart} className="mt-2 font-medium underline">
                  Update my cart
                </button>
              </div>
            )}
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <Row label="Items" value={formatPaise(quote.mrpTotalPaise)} />
              {quote.mrpTotalPaise > quote.subtotalPaise && <Row label="Discount" value={`− ${formatPaise(quote.mrpTotalPaise - quote.subtotalPaise)}`} accent />}
              <Row label="Delivery" value={quote.shippingPaise ? formatPaise(quote.shippingPaise) : "Free"} />
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <dt className="font-medium text-fg-strong">Total</dt>
                <dd className="font-semibold text-fg-strong tabular-nums">{formatPaise(quote.totalPaise)}</dd>
              </div>
              <p className="text-xs text-fg-muted">
                Includes {formatPaise(quote.gstPaise)} GST ({quote.gstRatePercent}%)
              </p>
            </dl>
          </>
        )}
        {message && (
          <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={blocked || busy}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          {phase === "creating" ? "Preparing payment…" : phase === "paying" ? "Complete payment in Razorpay" : phase === "verifying" ? "Confirming payment…" : quote ? `Pay ${formatPaise(quote.totalPaise)}` : "Pay"}
        </button>
        <p className="mt-3 text-center text-xs text-fg-muted">By paying you agree to our terms. Prices include GST.</p>
      </aside>
    </form>
  );
}

const inp = (error?: string) =>
  cn(
    "h-11 w-full rounded-md border bg-bg px-3 text-base text-fg-strong placeholder:text-fg-muted/60 focus:border-accent focus:outline-none sm:text-sm",
    error ? "border-danger" : "border-border hover:border-border-strong",
  );

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-fg-strong">{title}</h2>
      {children}
    </section>
  );
}

function F({ label, id, error, hint, className, children }: { label: string; id: string; error?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm text-fg">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-fg-muted">{label}</dt>
      <dd className={cn("tabular-nums", accent ? "text-accent" : "text-fg")}>{value}</dd>
    </div>
  );
}
