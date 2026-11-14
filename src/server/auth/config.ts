import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import type { Db, MongoClient } from "mongodb";

/**
 * Better Auth configuration. Kept free of `server-only`/Next imports so CLI scripts
 * (e.g. `pnpm create-owner`) can build the same auth instance.
 *
 * `role`, `permissions` and `status` are `input: false`, so they can never be set
 * through public sign-up. Only server code (owner actions / scripts) changes them.
 */
export function buildAuth({
  db,
  client,
  secret,
  baseURL,
  trustedOrigins = [],
  plugins = [],
}: {
  db: Db;
  client: MongoClient;
  secret: string;
  baseURL: string;
  trustedOrigins?: string[];
  plugins?: BetterAuthPlugin[];
}) {
  return betterAuth({
    appName: "Vevvion",
    secret,
    baseURL,
    trustedOrigins,
    database: mongodbAdapter(db, { client }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh daily
    },
    user: {
      additionalFields: {
        role: { type: ["customer", "staff", "owner"], required: false, defaultValue: "customer", input: false },
        permissions: { type: "string[]", required: false, defaultValue: [], input: false },
        status: { type: ["active", "blocked"], required: false, defaultValue: "active", input: false },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: baseURL.startsWith("https://"),
    },
    plugins,
  });
}

export type Auth = ReturnType<typeof buildAuth>;
