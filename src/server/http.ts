import "server-only";
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "./rate-limit";

/** Shared helpers for JSON route handlers. */

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readJson(request: Request, maxBytes = 32_000): Promise<unknown | null> {
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Returns a 429 response when the caller's IP exceeds the limit, otherwise null. */
export async function limitByIp(name: string, limit: number, windowSeconds: number) {
  const { allowed } = await rateLimit(`${name}:${await clientIp()}`, limit, windowSeconds);
  return allowed ? null : json({ message: "Too many requests. Please wait a moment and try again." }, 429);
}

/** Basic same-origin check for browser-called JSON endpoints (CSRF defence in depth). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients / same-origin GETs
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
