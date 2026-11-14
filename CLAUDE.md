# CLAUDE.md — Project guide for AI assistants

The full original brief is in `CLAUDE.md.txt` (the master prompt). This file is the short working guide.

## What this is
Production e-commerce platform (storefront + `/admin` portal) on Next.js App Router, TypeScript strict, Tailwind, Framer Motion, Lucide, MongoDB Atlas + Mongoose, Better Auth, Razorpay, Cloudinary, deployed on Vercel.

## Workflow rules
- Work **phase by phase** (see PROJECT_STATUS.md). Finish and test each phase before the next; update PROJECT_STATUS.md at the end of every phase.
- Never claim something works without running it/tests.
- Package manager: **pnpm**.
- Commit after each working module; never commit `.env*` (except `.env.example`).

## Non-negotiable rules
- Authorization inside every server action/route handler/admin loader (`requireAdmin`, `requireUser`). Middleware is UX only.
- Money = integer paise. Never trust client prices/amounts.
- Order becomes paid only via server-verified signature + gateway check, or verified webhook. One idempotent `finalizePaidOrder()`.
- Webhooks: raw body (`await req.text()`), HMAC verify, unique `eventId`.
- Server-only code lives in `src/server/**` and imports `server-only`.
- Zod-validate all input. Server components by default; `"use client"` only where needed.
- Order items are snapshots; never re-derive historical prices.

## Visual theme (owner decision, 2026-11-14)
- **Black background, green text** across storefront and admin. This overrides the brief's "white/neutral background".
- Proposed tokens (Tailwind CSS variables): `--bg #0A0A0A`, `--surface #121212`, `--border #1F2A22`, `--text #4ADE80` (green-400, primary text), `--text-muted #86EFAC99`, `--accent #22C55E` (buttons/links), `--accent-hover #16A34A`, `--danger #F87171`, `--warning #FBBF24`.
- Body text uses green that passes WCAG AA on black (#4ADE80 on #0A0A0A ≈ 11:1). Product images sit on dark surfaces with subtle borders, not heavy shadows. Errors and warnings keep red/amber so they stay recognizable.

## Docs map
ARCHITECTURE.md · DATABASE_SCHEMA.md · API_DOCUMENTATION.md · SECURITY.md · TESTING_CHECKLIST.md · DEPLOYMENT_GUIDE.md · PROJECT_STATUS.md

## Owner decisions (2026-11-14)
- Brand: **Vevvion**. Theme: black background, green text.
- Tax: **GST-inclusive prices** (`splitInclusiveGst` in `src/lib/money.ts` shows the GST part on invoices/order summaries).
- Shipping: **simple**. Collect and display the delivery address; the owner handles delivery manually. No courier integration. Admin enters status (and optional tracking note) by hand.
- Payments: **Razorpay only, no COD.**
- Roles: **owner** (the first admin, created by `pnpm create-owner`) can create and manage **staff** accounts with selectable permissions. Plus `customer`.
- Database: **MongoDB hosted on DigitalOcean** (not Atlas). URL provided by owner in `.env.local`.
- Images: **ImageKit** (owner decision). `IMAGE_PROVIDER=imagekit`. Cloudinary is not implemented.
- Env vars: the owner fills `.env.local` from `.env.example`.

## Still open (defaults used if not answered)
- Inventory timing → default: deduct at payment capture, auto-refund if sold out meanwhile.
- Email provider → default: Resend (emails disabled if no key).
- Reviews → default: verified buyers only, admin-moderated.
- Customer cancellation → default: customer can cancel before "packed"; no returns/exchanges flow in v1.
- Currency → INR only.
