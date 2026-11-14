"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "../auth";
import { connectDB } from "../db";
import { clientIp, rateLimit } from "../rate-limit";

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.email().max(200).transform((e) => e.toLowerCase()),
  password: z.string().min(1).max(128),
});

const GENERIC = "Invalid email or password.";

export async function adminSignInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "").slice(0, 200);
  if (!parsed.success) return { error: "Enter your email and password.", email };

  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`admin-login:ip:${ip}`, 10, 300),
    rateLimit(`admin-login:email:${parsed.data.email}`, 5, 300),
  ]);
  if (!byIp.allowed || !byEmail.allowed) return { error: "Too many attempts. Please wait 5 minutes and try again.", email };

  // Only owner/staff accounts may sign in here. Same message for every failure (no account enumeration).
  const mongoose = await connectDB();
  const account = await mongoose.connection.db
    ?.collection("user")
    .findOne({ email: parsed.data.email }, { projection: { role: 1, status: 1 } });
  if (!account || !["owner", "staff"].includes(account.role) || account.status === "blocked") return { error: GENERIC, email };

  try {
    const auth = await getAuth();
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch {
    return { error: GENERIC, email };
  }
  redirect("/admin");
}

export async function adminSignOutAction(): Promise<void> {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
