"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema, passwordSchema, profileSchema, registerSchema, safeNext, type AddressInput } from "@/lib/validators/account";
import { fieldErrors } from "@/lib/validators/product";
import { getAuth } from "../auth";
import { getCustomer } from "../customer";
import { connectDB } from "../db";
import { clientIp, rateLimit } from "../rate-limit";
import { addAddress, deleteAddress, setDefaultAddress } from "../services/account";

export type AccountState = { errors?: Record<string, string>; message?: string; values?: Record<string, string> };

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

async function limited(kind: string, email: string): Promise<boolean> {
  const ip = await clientIp();
  const [a, b] = await Promise.all([rateLimit(`${kind}:ip:${ip}`, 10, 300), rateLimit(`${kind}:email:${email}`, 5, 300)]);
  return !a.allowed || !b.allowed;
}

export async function registerAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const values = { name: str(formData, "name"), email: str(formData, "email"), phone: str(formData, "phone") };
  const parsed = registerSchema.safeParse({ ...values, password: str(formData, "password"), confirm: str(formData, "confirm") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (await limited("register", parsed.data.email)) return { errors: { _form: "Too many attempts. Please wait 5 minutes." }, values };

  const { name, email, phone, password } = parsed.data;
  try {
    const auth = await getAuth();
    await auth.api.signUpEmail({ body: { name, email, password, phone }, headers: await headers() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/exist/i.test(msg)) return { errors: { email: "An account with this email already exists. Log in instead." }, values };
    console.error("[register]", e);
    return { errors: { _form: "Couldn't create your account. Please try again." }, values };
  }
  redirect(safeNext(formData.get("next")));
}

export async function loginAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const values = { email: str(formData, "email") };
  const parsed = loginSchema.safeParse({ email: values.email, password: str(formData, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (await limited("login", parsed.data.email)) return { errors: { _form: "Too many attempts. Please wait 5 minutes and try again." }, values };

  const mongoose = await connectDB();
  const account = await mongoose.connection.db?.collection("user").findOne({ email: parsed.data.email }, { projection: { status: 1 } });
  if (account?.status === "blocked") return { errors: { _form: "This account has been disabled. Please contact the store." }, values };

  try {
    const auth = await getAuth();
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch {
    return { errors: { _form: "Incorrect email or password." }, values };
  }
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/?signedOut=1");
}

export async function updateProfileAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login?next=/account");
  const parsed = profileSchema.safeParse({ name: str(formData, "name"), phone: str(formData, "phone") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const auth = await getAuth();
  await auth.api.updateUser({ body: parsed.data, headers: await headers() });
  return { message: "Profile saved." };
}

export async function changePasswordAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login?next=/account");
  const parsed = passwordSchema.safeParse({ current: str(formData, "current"), password: str(formData, "password"), confirm: str(formData, "confirm") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  if (await limited("password", customer.email)) return { errors: { _form: "Too many attempts. Please wait 5 minutes." } };
  try {
    const auth = await getAuth();
    await auth.api.changePassword({ body: { currentPassword: parsed.data.current, newPassword: parsed.data.password, revokeOtherSessions: true }, headers: await headers() });
  } catch {
    return { errors: { current: "Current password is incorrect." } };
  }
  return { message: "Password changed. Other devices have been signed out." };
}

export async function addAddressAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login?next=/account");
  const input = Object.fromEntries(["name", "phone", "line1", "line2", "landmark", "city", "state", "pincode"].map((k) => [k, str(formData, k)])) as AddressInput;
  const res = await addAddress(customer.id, input, formData.get("isDefault") === "on");
  if (!res.ok) return { errors: res.errors, values: input as Record<string, string> };
  return { message: "Address saved." };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login?next=/account");
  await deleteAddress(customer.id, str(formData, "id"));
  redirect("/account?tab=addresses");
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login?next=/account");
  await setDefaultAddress(customer.id, str(formData, "id"));
  redirect("/account?tab=addresses");
}
