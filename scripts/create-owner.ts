/**
 * Creates (or promotes) the store owner account from OWNER_SEED_* env vars.
 *   pnpm create-owner
 * Safe to re-run: an existing user with that email is promoted to owner; the password is not changed.
 */
import mongoose from "mongoose";
import type { Db, MongoClient } from "mongodb";
import { buildAuth } from "@/server/auth/config";

async function main() {
  const { MONGODB_URI, MONGODB_DB_NAME, BETTER_AUTH_SECRET, BETTER_AUTH_URL, OWNER_SEED_NAME, OWNER_SEED_EMAIL, OWNER_SEED_PASSWORD } = process.env;
  const missing = Object.entries({ MONGODB_URI, BETTER_AUTH_SECRET, BETTER_AUTH_URL, OWNER_SEED_EMAIL, OWNER_SEED_PASSWORD })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);
  if (OWNER_SEED_PASSWORD!.length < 8) throw new Error("OWNER_SEED_PASSWORD must be at least 8 characters. Update .env.local and re-run.");

  await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB_NAME || undefined });
  const db = mongoose.connection.db as unknown as Db;
  const auth = buildAuth({
    db,
    client: mongoose.connection.getClient() as unknown as MongoClient,
    secret: BETTER_AUTH_SECRET!,
    baseURL: BETTER_AUTH_URL!,
  });

  const email = OWNER_SEED_EMAIL!.toLowerCase();
  const users = db.collection("user");
  let user = await users.findOne({ email });
  if (!user) {
    await auth.api.signUpEmail({ body: { name: OWNER_SEED_NAME || "Owner", email, password: OWNER_SEED_PASSWORD! } });
    user = await users.findOne({ email });
    console.log(`Created account ${email}`);
  } else {
    console.log(`Account ${email} already exists — promoting to owner (password unchanged).`);
  }
  await users.updateOne({ email }, { $set: { role: "owner", permissions: [], status: "active", emailVerified: true } });
  console.log(`✔ ${email} is now the store owner. Sign in at ${BETTER_AUTH_URL}/admin/login`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
