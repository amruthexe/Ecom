"use client";

import { useActionState } from "react";
import { INDIAN_STATES } from "@/lib/orders";
import { addAddressAction, changePasswordAction, updateProfileAction, type AccountState } from "@/server/actions/account";
import { Field, fieldCls, FormError, SubmitButton } from "./auth-forms";

function Saved({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-fg-strong" role="status">
      {message}
    </p>
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateProfileAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <Saved message={state.message} />
      <FormError message={e._form} />
      <Field label="Email" id="email" hint="Used to log in. Contact the store to change it.">
        <input id="email" value={email} readOnly className={fieldCls() + " opacity-70"} />
      </Field>
      <Field label="Full name" id="name" error={e.name}>
        <input id="name" name="name" defaultValue={name} autoComplete="name" className={fieldCls(e.name)} />
      </Field>
      <Field label="Mobile number" id="phone" error={e.phone}>
        <input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={phone} autoComplete="tel-national" className={fieldCls(e.phone)} />
      </Field>
      <SubmitButton pending={pending}>Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePasswordAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <Saved message={state.message} />
      <FormError message={e._form} />
      <Field label="Current password" id="current" error={e.current}>
        <input id="current" name="current" type="password" autoComplete="current-password" className={fieldCls(e.current)} />
      </Field>
      <Field label="New password" id="password" error={e.password} hint="At least 8 characters">
        <input id="password" name="password" type="password" autoComplete="new-password" className={fieldCls(e.password)} />
      </Field>
      <Field label="Confirm new password" id="confirm" error={e.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className={fieldCls(e.confirm)} />
      </Field>
      <SubmitButton pending={pending}>Change password</SubmitButton>
    </form>
  );
}

export function AddressForm({ defaultName, defaultPhone }: { defaultName: string; defaultPhone: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(addAddressAction, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} key={state.message} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <Saved message={state.message} />
        <FormError message={e._form} />
      </div>
      <Field label="Recipient name" id="a-name" error={e.name}>
        <input id="a-name" name="name" defaultValue={v.name ?? defaultName} className={fieldCls(e.name)} />
      </Field>
      <Field label="Mobile number" id="a-phone" error={e.phone}>
        <input id="a-phone" name="phone" type="tel" inputMode="tel" defaultValue={v.phone ?? defaultPhone} className={fieldCls(e.phone)} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="House / flat, building, street" id="a-line1" error={e.line1}>
          <input id="a-line1" name="line1" autoComplete="address-line1" defaultValue={v.line1} className={fieldCls(e.line1)} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Area / locality (optional)" id="a-line2">
          <input id="a-line2" name="line2" autoComplete="address-line2" defaultValue={v.line2} className={fieldCls()} />
        </Field>
      </div>
      <Field label="Landmark (optional)" id="a-landmark">
        <input id="a-landmark" name="landmark" defaultValue={v.landmark} className={fieldCls()} />
      </Field>
      <Field label="PIN code" id="a-pincode" error={e.pincode}>
        <input id="a-pincode" name="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" defaultValue={v.pincode} className={fieldCls(e.pincode)} />
      </Field>
      <Field label="City" id="a-city" error={e.city}>
        <input id="a-city" name="city" autoComplete="address-level2" defaultValue={v.city} className={fieldCls(e.city)} />
      </Field>
      <Field label="State" id="a-state" error={e.state}>
        <select id="a-state" name="state" defaultValue={v.state ?? ""} className={fieldCls(e.state)}>
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-fg sm:col-span-2">
        <input type="checkbox" name="isDefault" className="size-4 accent-[var(--accent)]" /> Make this my default address
      </label>
      <div className="sm:col-span-2">
        <SubmitButton pending={pending}>Save address</SubmitButton>
      </div>
    </form>
  );
}
