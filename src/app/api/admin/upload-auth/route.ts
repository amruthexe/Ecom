import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireStaff } from "@/server/auth";
import { getUploadAuth } from "@/server/imagekit";
import { rateLimit } from "@/server/rate-limit";

/** Issues a short-lived ImageKit upload signature to authorized staff only. */
export async function GET(request: NextRequest) {
  const folder = request.nextUrl.searchParams.get("folder") === "categories" ? "categories" : "products";
  try {
    const user = await requireStaff(folder === "categories" ? "categories" : "products");
    const { allowed } = await rateLimit(`upload-auth:${user.id}`, 60, 60);
    if (!allowed) return NextResponse.json({ error: "Too many uploads, slow down" }, { status: 429 });
    return NextResponse.json(getUploadAuth(folder), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[upload-auth]", e);
    return NextResponse.json({ error: "Upload is unavailable" }, { status: 500 });
  }
}
