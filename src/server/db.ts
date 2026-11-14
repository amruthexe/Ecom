import "server-only";
import mongoose from "mongoose";
import { env } from "./env";

/**
 * Cached Mongoose connection. Reused across hot reloads and serverless
 * invocations to avoid connection storms.
 *
 * Transactions require a replica set. DigitalOcean Managed MongoDB is a
 * replica set; a standalone mongod on a droplet is NOT. See DEPLOYMENT_GUIDE.md.
 */

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = (globalForMongoose.__mongoose ??= { conn: null, promise: null });

mongoose.set("strictQuery", true);
// NoSQL-injection defence: every user input is Zod-validated to primitives before it reaches a query,
// and user-supplied objects are never passed as filters. (Global `sanitizeFilter` is NOT used because it
// also neutralises our own `$in`/`$gte` operators.)

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const { MONGODB_URI, MONGODB_DB_NAME, MONGODB_TLS_CA_CERT } = env.db();
    cache.promise = mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      ...(MONGODB_TLS_CA_CERT ? { tls: true, ca: MONGODB_TLS_CA_CERT.replace(/\\n/g, "\n") } : {}),
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
