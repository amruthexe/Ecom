import { NextResponse, type NextRequest } from "next/server";
import { describeOrderListParams, parseOrderListParams } from "@/lib/order-filters";
import { audit } from "@/server/audit";
import { AuthorizationError, requireStaff } from "@/server/auth";
import { buildOrdersPdf } from "@/server/exports/orders-pdf";
import { buildOrdersWorkbook } from "@/server/exports/orders-xlsx";
import { rateLimit } from "@/server/rate-limit";
import { listOrdersForExport } from "@/server/services/sales";

/**
 * GET /api/admin/orders/export?format=xlsx|pdf&filter=&q=&from=&to=
 * Exports every order matching the same filters as /admin/orders (not just the visible page).
 * Staff with the "orders" permission only. Contains customer personal data → never cached.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "xlsx";
  try {
    const user = await requireStaff("orders");
    const { allowed } = await rateLimit(`orders-export:${user.id}`, 20, 60);
    if (!allowed) return NextResponse.json({ error: "Too many exports, please wait a minute." }, { status: 429 });

    const params = parseOrderListParams(sp);
    const { rows, total, truncated } = await listOrdersForExport(params);
    const meta = { filters: describeOrderListParams(params), generatedAt: new Date(), generatedBy: user.email, total, truncated };

    const body = format === "pdf" ? buildOrdersPdf(rows, meta) : await buildOrdersWorkbook(rows, meta);
    // Exports contain customer personal data, so record who exported what.
    await audit(user, { action: "orders.export", entity: "order", entityId: "-", summary: `Exported ${rows.length} orders as ${format.toUpperCase()} (${meta.filters})`, changes: { format, ...params } }).catch(() => {});

    const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(meta.generatedAt);
    const name = `vevvion-orders-${params.filter}-${stamp}.${format}`;
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[orders-export]", e);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
