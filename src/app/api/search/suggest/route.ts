import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { suggest } from "@/server/catalog";

const querySchema = z.string().trim().min(2).max(80);

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ suggestions: [] });
  const suggestions = await suggest(parsed.data, 8);
  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=60" } });
}
