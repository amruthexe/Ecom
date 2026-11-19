import "server-only";
import ExcelJS from "exceljs";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import type { OrderExportRow } from "../services/sales";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
/** Excel has no time zones: shift to India time so the sheet shows the same clock time as the admin. */
const ist = (d?: Date) => (d ? new Date(d.getTime() + IST_OFFSET_MS) : null);
const rupees = (paise: number) => Math.round(paise) / 100;

const MONEY = '"₹"#,##0.00';
const DATE_TIME = "dd-mmm-yyyy hh:mm";
const GREEN = "FF3D6936"; // logo forest green (VEVVION lettering)
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } } as const;

export function fullAddress(a: OrderExportRow["address"]): string {
  return [a.line1, a.line2, a.landmark && `Landmark: ${a.landmark}`, a.city, `${a.state} ${a.pincode}`].filter(Boolean).join(", ");
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = HEADER_FONT;
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

export async function buildOrdersWorkbook(rows: OrderExportRow[], meta: { filters: string; generatedAt: Date; generatedBy: string; total: number; truncated: boolean }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vevvion admin";
  wb.created = meta.generatedAt;

  /* ── Sheet 1: one row per order ── */
  const orders = wb.addWorksheet("Orders");
  orders.columns = [
    { header: "Order no.", key: "orderNumber", width: 12 },
    { header: "Order date", key: "createdAt", width: 18, style: { numFmt: DATE_TIME } },
    { header: "Paid on", key: "paidAt", width: 18, style: { numFmt: DATE_TIME } },
    { header: "Order status", key: "status", width: 16 },
    { header: "Payment status", key: "paymentStatus", width: 18 },
    { header: "Customer", key: "customer", width: 22 },
    { header: "Email", key: "email", width: 28 },
    { header: "Phone", key: "phone", width: 14 },
    { header: "Ship to", key: "shipName", width: 22 },
    { header: "Ship-to phone", key: "shipPhone", width: 14 },
    { header: "Address", key: "address", width: 45 },
    { header: "City", key: "city", width: 16 },
    { header: "State", key: "state", width: 16 },
    { header: "Pincode", key: "pincode", width: 10 },
    { header: "Items", key: "items", width: 45 },
    { header: "Qty", key: "qty", width: 6 },
    { header: "MRP total", key: "mrp", width: 12, style: { numFmt: MONEY } },
    { header: "Discount", key: "discount", width: 12, style: { numFmt: MONEY } },
    { header: "Subtotal", key: "subtotal", width: 12, style: { numFmt: MONEY } },
    { header: "Shipping", key: "shipping", width: 11, style: { numFmt: MONEY } },
    { header: "GST (incl.)", key: "gst", width: 12, style: { numFmt: MONEY } },
    { header: "Order total", key: "total", width: 13, style: { numFmt: MONEY } },
    { header: "Refunded", key: "refunded", width: 12, style: { numFmt: MONEY } },
    { header: "Net received", key: "net", width: 13, style: { numFmt: MONEY } },
    { header: "Payment method", key: "method", width: 14 },
    { header: "Razorpay payment ID", key: "rzpPay", width: 22 },
    { header: "Razorpay order ID", key: "rzpOrder", width: 22 },
    { header: "Tracking note", key: "tracking", width: 28 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  for (const o of rows) {
    const paid = o.paymentStatus === "paid" || o.paymentStatus === "refunded" || o.paymentStatus === "partially_refunded";
    orders.addRow({
      orderNumber: o.orderNumber,
      createdAt: ist(o.createdAt),
      paidAt: ist(o.paidAt),
      status: ORDER_STATUS_LABEL[o.status] ?? o.status,
      paymentStatus: PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus,
      customer: o.customer,
      email: o.email,
      phone: o.phone,
      shipName: o.address.name,
      shipPhone: o.address.phone,
      address: fullAddress(o.address),
      city: o.address.city,
      state: o.address.state,
      pincode: o.address.pincode,
      items: o.items.map((i) => `${i.name}${i.options ? ` (${i.options})` : ""} × ${i.qty}`).join(", "),
      qty: o.itemCount,
      mrp: rupees(o.mrpTotalPaise),
      discount: rupees(o.discountPaise),
      subtotal: rupees(o.subtotalPaise),
      shipping: rupees(o.shippingPaise),
      gst: rupees(o.gstPaise),
      total: rupees(o.totalPaise),
      refunded: rupees(o.refundedPaise),
      net: paid ? rupees(o.totalPaise - o.refundedPaise) : 0,
      method: o.paymentMethod ?? "",
      rzpPay: o.razorpayPaymentId ?? "",
      rzpOrder: o.razorpayOrderId ?? "",
      tracking: o.trackingNote ?? "",
      notes: [o.cancelReason && `Cancelled: ${o.cancelReason}`, o.needsAttention && `Attention: ${o.needsAttention}`].filter(Boolean).join(" · "),
    });
  }
  styleHeader(orders);
  orders.getColumn("address").alignment = { wrapText: true, vertical: "top" };
  orders.getColumn("items").alignment = { wrapText: true, vertical: "top" };
  orders.getColumn("pincode").numFmt = "@";
  orders.getColumn("phone").numFmt = "@";
  orders.getColumn("shipPhone").numFmt = "@";
  if (rows.length) {
    const last = rows.length + 1;
    const totalRow = orders.addRow({ orderNumber: "TOTAL", qty: { formula: `SUM(P2:P${last})` } });
    for (const key of ["mrp", "discount", "subtotal", "shipping", "gst", "total", "refunded", "net"]) {
      const col = orders.getColumn(key).letter;
      totalRow.getCell(key).value = { formula: `SUM(${col}2:${col}${last})` };
    }
    totalRow.font = { bold: true };
    totalRow.border = { top: { style: "thin" } };
  }

  /* ── Sheet 2: one row per product line ── */
  const items = wb.addWorksheet("Items");
  items.columns = [
    { header: "Order no.", key: "orderNumber", width: 12 },
    { header: "Order date", key: "createdAt", width: 18, style: { numFmt: DATE_TIME } },
    { header: "Order status", key: "status", width: 16 },
    { header: "Payment status", key: "paymentStatus", width: 18 },
    { header: "Customer", key: "customer", width: 22 },
    { header: "Product", key: "name", width: 30 },
    { header: "Options", key: "options", width: 16 },
    { header: "SKU", key: "sku", width: 16 },
    { header: "Qty", key: "qty", width: 6 },
    { header: "MRP (each)", key: "mrp", width: 12, style: { numFmt: MONEY } },
    { header: "Price (each)", key: "price", width: 12, style: { numFmt: MONEY } },
    { header: "Line total", key: "line", width: 12, style: { numFmt: MONEY } },
  ];
  for (const o of rows)
    for (const i of o.items)
      items.addRow({
        orderNumber: o.orderNumber,
        createdAt: ist(o.createdAt),
        status: ORDER_STATUS_LABEL[o.status] ?? o.status,
        paymentStatus: PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus,
        customer: o.customer,
        name: i.name,
        options: i.options ?? "",
        sku: i.sku ?? "",
        qty: i.qty,
        mrp: rupees(i.unitMrpPaise),
        price: rupees(i.unitPricePaise),
        line: rupees(i.lineTotalPaise),
      });
  styleHeader(items);

  /* ── Sheet 3: what this export contains ── */
  const info = wb.addWorksheet("Summary");
  info.columns = [
    { key: "k", width: 26 },
    { key: "v", width: 60 },
  ];
  const paidRows = rows.filter((o) => ["paid", "refunded", "partially_refunded"].includes(o.paymentStatus));
  const gross = paidRows.reduce((n, o) => n + o.totalPaise, 0);
  const refunded = paidRows.reduce((n, o) => n + o.refundedPaise, 0);
  info.addRow({ k: "Vevvion — Orders export" }).font = { bold: true, size: 14, color: { argb: GREEN } };
  info.addRow({});
  const summary: [string, string | number | Date | null][] = [
    ["Filters", meta.filters],
    ["Generated (India time)", ist(meta.generatedAt)],
    ["Generated by", meta.generatedBy],
    ["Orders in this file", rows.length],
    ["Paid orders", paidRows.length],
    ["Paid order value", rupees(gross)],
    ["Refunded", rupees(refunded)],
    ["Net received", rupees(gross - refunded)],
  ];
  for (const [k, v] of summary) {
    const r = info.addRow({ k, v });
    r.getCell("k").font = { bold: true };
    if (typeof v === "number" && k !== "Orders in this file" && k !== "Paid orders") r.getCell("v").numFmt = MONEY;
    if (v instanceof Date) r.getCell("v").numFmt = DATE_TIME;
    r.getCell("v").alignment = { horizontal: "left" };
  }
  if (meta.truncated)
    info.addRow({ k: "Note", v: `Only the newest ${rows.length} of ${meta.total} matching orders are included. Narrow the date range to export the rest.` }).font = { color: { argb: "FFB45309" } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
