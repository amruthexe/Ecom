import "server-only";
import { nextCookies } from "better-auth/next-js";
import type { Db, MongoClient } from "mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isPermission, type Permission, type StaffUser } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { connectDB } from "../db";
import { env } from "../env";
import { buildAuth, type Auth } from "./config";

let authPromise: Promise<Auth> | null = null;

/** Lazily builds Better Auth on top of the shared Mongoose connection (one pool). */
export function getAuth(): Promise<Auth> {
  authPromise ??= (async () => {
    const mongoose = await connectDB();
    const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = env.auth();
    return buildAuth({
      db: mongoose.connection.db as unknown as Db,
      client: mongoose.connection.getClient() as unknown as MongoClient,
      secret: BETTER_AUTH_SECRET,
      baseURL: BETTER_AUTH_URL,
      plugins: [nextCookies()],
    });
  })().catch((e) => {
    authPromise = null;
    throw e;
  });
  return authPromise;
}

export async function getSession() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
}

/** Returns the signed-in admin user (owner/staff), or null for customers/guests/blocked users. */
export async function getStaffUser(): Promise<StaffUser | null> {
  const session = await getSession();
  const user = session?.user as (NonNullable<typeof session>["user"] & { role?: string; permissions?: string[]; status?: string }) | undefined;
  if (!user || user.status === "blocked") return null;
  if (user.role !== "owner" && user.role !== "staff") return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: (user.permissions ?? []).filter(isPermission),
  };
}

export class AuthorizationError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For pages: redirects to login when signed out, to /admin when lacking the permission. */
export async function requireStaffPage(permission?: Permission): Promise<StaffUser> {
  const user = await getStaffUser();
  if (!user) redirect("/admin/login");
  if (permission && !hasPermission(user, permission)) redirect("/admin?denied=" + permission);
  return user;
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function requireStaff(permission?: Permission | Permission[]): Promise<StaffUser> {
  const user = await getStaffUser();
  if (!user) throw new AuthorizationError("Please sign in again.");
  const needed = permission === undefined ? [] : Array.isArray(permission) ? permission : [permission];
  if (needed.length && !needed.some((p) => hasPermission(user, p))) throw new AuthorizationError();
  return user;
}

export async function requireOwner(): Promise<StaffUser> {
  const user = await getStaffUser();
  if (!user || user.role !== "owner") throw new AuthorizationError("Only the store owner can do that.");
  return user;
}
