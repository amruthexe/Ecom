# Project Status — Vevvion

_Last updated: 2026-11-14_

## Current phase: **Customer accounts done** → next: staff management, order emails (needs verified Resend domain), coupons, store settings

| Phase | Status |
|---|---|
| 0. Requirements analysis, architecture, docs | ☑ Done |
| 1. Project setup & architecture | ☑ Done |
| 2. Design system & storefront | ☑ Done (demo catalog; awaiting Stitch design reference) |
| 3. MongoDB & models | ◐ Category, Product (variants), InventoryTransaction, AuditLog, rate limits. Order/Payment/Coupon/etc. come with their phases |
| 4. Auth, owner/staff roles & authorization | ◐ Better Auth, owner/staff/customer roles, permissions, admin login. Staff management UI pending |
| 5. Admin dashboard | ◐ Catalogue stats; orders/revenue come after checkout |
| 6. Product & category management | ☑ Done |
| 7. Image management (ImageKit) | ☑ Done |
| 8. Cart & checkout | ☑ Done (guest checkout; coupons pending) |
| 9. Razorpay integration | ◐ Built + tested with a fake gateway; live keys currently rejected (401) |
| 10. Order & payment management | ☑ Done |
| 11. Customer accounts & notifications | ◐ Accounts done (login required to order, cross-device cart & orders, addresses, admin customers). Emails pending |
| 12. Analytics, security, optimization | ☐ |
| 13. Testing & deployment | ☐ |

## Completed
**Phase 1**
- Next.js 16.4.6 + React 19.3 + TypeScript strict + Tailwind 4 + ESLint (Cache Components on)
- Dependencies: mongoose 9, zod 4, better-auth 1.7, razorpay, motion, lucide-react, server-only, clsx, tailwind-merge; dev: vitest, mongodb-memory-server, tsx
- `.env.example` with all variable names (owner fills `.env.local`)
- `src/server/env.ts`: lazy Zod validation of env groups (build works without secrets)
- `src/server/db.ts`: cached Mongoose connection, DigitalOcean TLS CA support, `sanitizeFilter` on
- `src/lib/money.ts`: paise formatting, GST-inclusive split, discount %
- Theme tokens (black bg / green text) in `globals.css`; Inter + Space Grotesk fonts; placeholder home + 404
- Vitest set up with a `server-only` stub
- Own git repository for the project

**Phase 2**
- UI kit (`src/components/ui`): Button, Input/Select/Label, Badge, Container/Card/Skeleton/SectionHeading/EmptyState, Price, Sheet (animated drawer), Reveal (scroll animation, honors reduced motion)
- Store components: header (sticky, search with suggestions, cart count), mobile nav drawer, footer, product card/grid + skeletons, gallery, variant/quantity/add-to-cart panel, filters (work without JS), sort, pagination, cart view
- Routes: `/`, `/products` (search, category, price, sort, pagination), `/products/[slug]`, `/categories/[slug]`, `/cart`, `/api/search/suggest`, store error page, 404
- Cart: client-side, localStorage, Zod-validated on load, max 10 per line, capped at stock. **Display prices only**; checkout (Phase 8) recomputes on the server
- Catalog read API `src/server/catalog` currently uses **demo data** (`demo-data.ts`, 16 products / 5 categories). Phase 3 swaps it for MongoDB with the same function signatures
- Products without uploaded images show generated on-brand SVG artwork
- `next.config.ts` allows images from `ik.imagekit.io`

**Admin portal (phases 3–7)**
- Pricing model: **MRP + discount %** (0–90, whole numbers); sale price = MRP × (100 − %) rounded to the rupee. Variants may override MRP; the discount still applies
- Models: Category, Product (variants, images, denormalized `pricePaise`/`totalStock`), InventoryTransaction (every stock change), AuditLog, app rate limits (TTL)
- Auth: Better Auth (Mongo adapter, shared pool), roles `customer | staff | owner`, per-module permissions, `status` (blocked). Role fields can't be set via sign-up
- Admin login `/admin/login` (only owner/staff, rate-limited 5/5 min per email, 10/5 min per IP, generic errors). `proxy.ts` optimistic redirect + `requireStaff*` in every page/action/route
- Admin pages (mobile-first: bottom tabs, slide-out menu, sticky save bar, card lists on phones, tables on desktop): dashboard, products (search, status/stock filters, pagination), add/edit product (details, images, MRP + discount chips with live price, SKU/stock, variants generator, status, featured, category, tags, URL), publish/unpublish/archive/delete, categories (add/edit/delete-safe, image)
- ImageKit: server-signed direct browser upload with progress, type/size checks, reorder, cover, alt text, removed images deleted from ImageKit on save; next/image uses an ImageKit loader (resize + AVIF/WebP at the CDN)
- Storefront reads MongoDB (cached, tag `catalog`; admin saves call `updateTag` so changes show immediately). `pnpm seed` loaded 16 starter products / 5 categories
- Scripts: `pnpm seed`, `pnpm create-owner`, `pnpm cleanup-images`, `pnpm test`, `pnpm test:e2e` (admin E2E needs E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD; runs on port 3100)
- Phone testing on Wi-Fi: open `http://<PC-IP>:3000`; add that origin to `BETTER_AUTH_TRUSTED_ORIGINS`; dev server allows 192.168.x.x / 10.x.x.x
- Image guidance: products 4:5 portrait (1200×1500 px ideal), categories 1:1 square (1000×1000), max 5 MB, JPG/PNG/WebP/AVIF

**Checkout & payments (phases 8–10)**
- Models: Order (item/price/address snapshots, status history, `stockDeducted` guard), Payment (Razorpay ids, refunds), WebhookEvent (unique event id, 90-day TTL), Counter (order numbers VV100001…), StoreSettings (shipping, GST %, pending-order TTL)
- Pricing only on the server (`quoteCart`): DB prices, discount %, stock checks, merged duplicate lines, shipping rule, GST-inclusive split
- Flow: /checkout → POST /api/checkout (pending order + Razorpay order, idempotency key) → Razorpay Checkout → POST /api/payments/verify (HMAC + fetch payment from Razorpay, capture if authorized) → single idempotent `finalizePaidOrder` (transaction, atomic claim, conditional stock decrement, inventory log). Webhook /api/webhooks/razorpay (raw-body HMAC, duplicate-safe) uses the same function
- Sold out between checkout and payment → order cancelled + automatic full refund + "needs attention" flag
- Failed payments → payment_failed (retry in the same Razorpay window still confirms); abandoned → expired by /api/cron/expire-orders (CRON_SECRET); late payments still confirm
- Customer pages: /checkout (validated Indian address/phone/PIN), /payment/success, /payment/failed, /orders/[id]?t= (HMAC-derived private link)
- Admin: Orders (filters: to fulfil, shipped, delivered, unpaid/failed, cancelled, needs attention; search), order detail (items, customer, address, payment ids, refunds, timeline), status buttons (processing → packed → shipped (+ tracking note) → delivered), cancel (restock + optional refund), partial/full refunds (refunds permission), Payments list, dashboard revenue (today / 7 / 14 days, India time, net of refunds) + 14-day chart + recent orders
- Automated tests NEVER use real keys (vitest forces dummy Razorpay keys; fake gateway)

**Customer accounts**
- Owner decision (2026-11-14): customers must log in before ordering; browsing and adding to cart stay open
- Register/login (/account/register, /account/login, rate-limited, safe `next` redirects), My account (profile, addresses, password change signs out other devices, logout), My orders + order detail (ownership-checked, auto-reconciles unpaid orders with Razorpay)
- Cart saved to the account (Cart model + /api/cart) → same cart on every device; guest cart merged at login; logout clears the device cart
- Checkout requires login (page + API 401); account email always used; saved-address picker; new addresses saved
- Admin → Customers: list (orders, spent, joined), detail (orders, addresses), block/unblock (signs out everywhere)
- No email verification / self-service password reset yet (Resend has no verified domain) → owner resets passwords for now

## Decisions
See CLAUDE.md → "Owner decisions" and "Still open".

## Waiting on owner
- **Razorpay**: keys in `.env.local` are still rejected (401 Authentication failed, re-checked 2026-11-14 13:38). Need a matching live Key ID + Key Secret, and a strong webhook secret; then add the webhook in the Razorpay dashboard once the site has a public URL
- **Resend**: key valid but no verified domain, so use `onboarding@resend.dev` until a domain is verified
- Recommended: create a dedicated DB user instead of `doadmin`

## Known bugs / limitations
- Unknown product/category URLs return HTTP 200 with the 404 UI + `noindex` (documented Next.js streaming behaviour with Cache Components). Not harmful for SEO
- Newsletter form is UI-only (sign-ups not stored until Phase 11). The confirmation says so
- No order emails yet; the success page does not claim an email was sent
- No self-service password reset yet (needs verified email domain)
- Order VV100002 (owner's ₹1 test, placed as guest before accounts existed) is not linked to any customer account
- Coupons not built yet
- Shipping is free by default (StoreSettings); there is no settings screen yet to change shipping/GST
- Webhooks need a public URL (deployment or a tunnel); on localhost the checkout callback alone confirms orders
- Images uploaded in the form but never saved stay in ImageKit until `pnpm cleanup-images --apply` is run (dry run by default; only touches unused files older than 60 min)
- Product delete is permanent; once orders exist (Phase 10) it must switch to archive for ordered products (TODO in code)
- Mobile layout not yet verified in a real browser/Playwright (Phase 13 E2E; manual check recommended)

## Testing results
| Date | Check | Result |
|---|---|---|
| 2026-11-14 | `pnpm typecheck` | ✅ pass |
| 2026-11-14 | `pnpm lint` | ✅ pass |
| 2026-11-14 | `pnpm test` (6 unit tests: money, GST, slugify) | ✅ 6/6. Caught and fixed a ₹1.5 → ₹1.50 formatting bug |
| 2026-11-14 | `pnpm build` | ✅ pass |
| 2026-11-14 | `pnpm start` smoke: `/` → 200, `/nope` → 404 | ✅ pass |
| 2026-11-14 | MongoDB (DigitalOcean) connect + replica set + transaction | ✅ MongoDB 8.0.26, replica set, transaction OK, no CA cert needed |
| 2026-11-14 | Razorpay credential check (read-only) | ❌ 401 Unauthorized. Owner will provide new live keys |
| 2026-11-14 | ImageKit: auth, upload, CDN delivery, delete (1×1 test image) | ✅ 200 / 200 / 204 |
| 2026-11-14 | Resend key check (read-only) | ✅ valid, ⚠ no verified domain |
| 2026-11-14 | Phase 2: typecheck, lint, build (30 pages) | ✅ pass |
| 2026-11-14 | Phase 2: unit tests (pricing, variants, stock, query parsing, filters, sort, pagination, suggestions) | ✅ 20/20 |
| 2026-11-14 | Phase 2: HTTP smoke of all store routes + suggest API, junk query params | ✅ pass (404 pages: 200 + noindex, see limitations) |
| 2026-11-14 | Admin: typecheck, lint, build | ✅ pass |
| 2026-11-14 | Unit tests (discount pricing, variants, validation, permissions, query parsing) | ✅ 24/24 |
| 2026-11-14 | Integration tests on isolated `vevvion_test` DB (create/update/stock history/audit/slug/SKU/image URL/variants/status/delete, category safe delete) | ✅ 11/11 |
| 2026-11-14 | Security smoke: /admin without cookie → 307 login; forged cookie → redirect, no data; upload-auth anon/forged → 403; wrong-origin sign-in → 403; sign-in rate limit → 429 after 3 bad tries | ✅ pass |
| 2026-11-14 | Playwright (Pixel 7 + desktop): no horizontal overflow on 6 routes, cart flow, filters/suggestions, admin redirect, bad login | ✅ 20/20 (admin flow skipped: no account) |
| 2026-11-14 | Owner account `admin@vevvion.com` created (`pnpm create-owner`), login verified | ✅ |
| 2026-11-14 | Admin E2E (Pixel 7 + desktop): sign in → create product with ImageKit upload + 25% off → visible in store → edit → delete | ✅ 3/3 |
| 2026-11-14 | Full Playwright suite | ✅ 23/23 |
| 2026-11-14 | Payment integration tests (fake gateway, vevvion_test): server pricing, idempotent checkout, forged signature, single stock deduction incl. 5 concurrent confirmations, authorized→capture, amount mismatch, sold-out auto-refund, webhook signature/duplicates/failed→retry, partial & over-refund, status flow, cancel restock, expiry + late payment | ✅ 17/17 (52 total) |
| 2026-11-14 | E2E checkout (mobile + desktop): validation errors, graceful "temporarily unavailable" when Razorpay rejects keys, forged order links show nothing; admin orders/payments/revenue pages | ✅ |
| 2026-11-14 | Test orders created by E2E removed from live DB; order counter reset to VV100001 | done |
| 2026-11-14 | Real ₹1 live payment (VV100002) rejected as "amount mismatch" because Razorpay added a ₹0.03 customer-paid fee → fixed (fee-aware check + Razorpay order check), order reconciled to Confirmed/Paid | fixed |
| 2026-11-14 | Two-device account E2E (mobile + desktop): login-gated checkout, guest cart merged at signup, same cart & orders on 2nd device, other customer's order hidden, logout clears device cart, admin sees customer | ✅ |
| 2026-11-14 | Full Playwright suite | ✅ 31/31; unit+integration ✅ 56/56; test customers removed from live DB |
| 2026-11-14 | Bugs caught by admin E2E and fixed: (1) products created after the build crashed their store page (params now awaited inside Suspense = ISR with Cache Components); (2) ImageKit bulk delete used the wrong endpoint; (3) uploader used `crypto.randomUUID` (breaks on http LAN phones); (4) admin dev-mode blocking-route error (`instant = false`) | fixed |
| 2026-11-14 | Bug caught: global Mongoose `sanitizeFilter` broke `$in`/`$gte` queries → removed, documented in SECURITY.md | fixed |

## Environment notes
- `B:\` drive root is itself a git repo (owned by SYSTEM). This project has its own repo at `B:\ecommerce-platform`.
- Node 24.22.1, pnpm 10.19.0.
