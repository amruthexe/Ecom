import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { formatPaise } from "@/lib/money";
import type { OrderExportRow } from "../services/sales";
import { fullAddress } from "./orders-xlsx";

/*
 * Printable order report (A4 landscape, white paper, brand green accents).
 * Poppins is embedded because the built-in PDF fonts have no ₹ glyph.
 * Font/logo files are read from disk; next.config.ts traces them into the serverless bundle.
 */
const root = process.cwd();
let assets: { regular: string; semibold: string; logo: string } | null = null;
function loadAssets() {
  assets ??= {
    regular: readFileSync(path.join(root, "src/server/fonts/Poppins-Regular.ttf")).toString("base64"),
    semibold: readFileSync(path.join(root, "src/server/fonts/Poppins-SemiBold.ttf")).toString("base64"),
    logo: readFileSync(path.join(root, "public/brand/logo-mark-256.png")).toString("base64"),
  };
  return assets;
}

const GREEN: [number, number, number] = [22, 163, 74];
const DARK: [number, number, number] = [20, 30, 24];
const MUTED: [number, number, number] = [95, 110, 100];

const dateTime = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const fmt = (d?: Date) => (d ? dateTime.format(d) : "");

export function buildOrdersPdf(rows: OrderExportRow[], meta: { filters: string; generatedAt: Date; generatedBy: string; total: number; truncated: boolean }): Buffer {
  const a = loadAssets();
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
  doc.addFileToVFS("Poppins-Regular.ttf", a.regular);
  doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
  doc.addFileToVFS("Poppins-SemiBold.ttf", a.semibold);
  doc.addFont("Poppins-SemiBold.ttf", "Poppins", "bold");
  doc.setFont("Poppins", "normal");
  doc.setProperties({ title: "Vevvion orders", creator: "Vevvion admin" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 32;

  /* ── Header ── */
  doc.addImage(`data:image/png;base64,${a.logo}`, "PNG", margin, 26, 30, 30);
  doc.setFont("Poppins", "bold").setFontSize(18).setTextColor(...GREEN);
  doc.text("VEVVION", margin + 38, 46);
  doc.setFont("Poppins", "normal").setFontSize(9).setTextColor(...MUTED);
  doc.text("Orders report", margin + 38, 58);
  doc.setFontSize(8.5);
  doc.text(`Generated ${fmt(meta.generatedAt)} (IST) by ${meta.generatedBy}`, pageW - margin, 40, { align: "right" });
  doc.text(meta.filters, pageW - margin, 52, { align: "right", maxWidth: 420 });

  /* ── Summary boxes ── */
  const paidRows = rows.filter((o) => ["paid", "refunded", "partially_refunded"].includes(o.paymentStatus));
  const gross = paidRows.reduce((n, o) => n + o.totalPaise, 0);
  const refunded = paidRows.reduce((n, o) => n + o.refundedPaise, 0);
  const stats: [string, string][] = [
    ["Orders", String(rows.length)],
    ["Paid orders", String(paidRows.length)],
    ["Paid value", formatPaise(gross)],
    ["Refunded", formatPaise(refunded)],
    ["Net received", formatPaise(gross - refunded)],
  ];
  const boxY = 72;
  const gap = 8;
  const boxW = (pageW - margin * 2 - gap * (stats.length - 1)) / stats.length;
  stats.forEach(([label, value], i) => {
    const x = margin + i * (boxW + gap);
    doc.setDrawColor(210, 230, 215).setFillColor(244, 251, 246).roundedRect(x, boxY, boxW, 40, 4, 4, "FD");
    doc.setFont("Poppins", "normal").setFontSize(8).setTextColor(...MUTED).text(label, x + 10, boxY + 15);
    doc.setFont("Poppins", "bold").setFontSize(12).setTextColor(...DARK).text(value, x + 10, boxY + 32);
  });
  let startY = boxY + 54;
  if (meta.truncated) {
    doc.setFont("Poppins", "normal").setFontSize(8.5).setTextColor(180, 83, 9);
    doc.text(`Showing the newest ${rows.length} of ${meta.total} matching orders. Narrow the date range to export the rest.`, margin, startY);
    startY += 12;
  }

  /* ── Orders table ── */
  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin, bottom: 36 },
    head: [["Order", "Customer", "Ship to", "Items", "Status", "Payment", "Total"]],
    body: rows.map((o) => [
      `${o.orderNumber}\n${fmt(o.createdAt)}`,
      [o.customer, o.phone, o.email].filter(Boolean).join("\n"),
      `${o.address.name} · ${o.address.phone}\n${fullAddress(o.address)}`,
      o.items.map((i) => `${i.name}${i.options ? ` (${i.options})` : ""} × ${i.qty}`).join("\n"),
      ORDER_STATUS_LABEL[o.status] ?? o.status,
      [PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus, o.paymentMethod, o.razorpayPaymentId].filter(Boolean).join("\n"),
      [formatPaise(o.totalPaise), o.refundedPaise ? `Refunded ${formatPaise(o.refundedPaise)}` : "", o.gstPaise ? `incl. GST ${formatPaise(o.gstPaise)}` : ""].filter(Boolean).join("\n"),
    ]),
    styles: { font: "Poppins", fontSize: 7.5, textColor: DARK, cellPadding: 5, valign: "top", lineColor: [225, 232, 227], lineWidth: 0.5, overflow: "linebreak" },
    headStyles: { font: "Poppins", fontStyle: "bold", fillColor: GREEN, textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 251, 249] },
    columnStyles: {
      0: { cellWidth: 92 },
      1: { cellWidth: 118 },
      2: { cellWidth: 178 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 60 },
      5: { cellWidth: 116 },
      6: { cellWidth: 76, halign: "right" },
    },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFont("Poppins", "normal").setFontSize(7.5).setTextColor(...MUTED);
      doc.text("Vevvion — A New Vision To Success · Prices include GST", margin, h - 18);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageW - margin, h - 18, { align: "right" });
    },
  });

  if (!rows.length) {
    doc.setFont("Poppins", "normal").setFontSize(10).setTextColor(...MUTED);
    doc.text("No orders match these filters.", margin, startY + 40);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
