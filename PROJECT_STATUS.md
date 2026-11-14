# Project Status — Vevvion

_Last updated: 2026-11-14_

## Current phase: **Admin portal (products & categories) built** → next: owner account, staff management, then cart & checkout

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
| 8. Cart & checkout | ☐ |
| 9. Razorpay integration | ☐ |
| 10. Order & payment management | ☐ |
| 11. Customer accounts & notifications | ☐ |
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
- Scripts: `pnpm seed`, `pnpm create-owner`, `pnpm test`, `pnpm test:e2e`

## Decisions
See CLAUDE.md → "Owner decisions" and "Still open".

## Waiting on owner
- **Razorpay**: owner will provide new LIVE key id + secret (current ones rejected with 401) and a strong webhook secret. Needed for Phase 9
- **Owner account not created yet**: set `OWNER_SEED_PASSWORD` (8+ chars) in `.env.local`, then run `pnpm create-owner`
- **Resend**: key valid but no verified domain, so use `onboarding@resend.dev` until a domain is verified
- Recommended: create a dedicated DB user instead of `doadmin`

## Known bugs / limitations
- Unknown product/category URLs return HTTP 200 with the 404 UI + `noindex` (documented Next.js streaming behaviour with Cache Components). Not harmful for SEO
- Newsletter form is UI-only (sign-ups not stored until Phase 11). The confirmation says so
- Checkout button is disabled until Phase 8
- Images uploaded in the form but never saved (form abandoned) stay in ImageKit (no cleanup job yet)
- Product delete is permanent; once orders exist (Phase 10) it must switch to archive for ordered products (TODO in code)
- Admin E2E flow (login → create → store → edit → delete) is written but NOT yet run: needs an owner/staff account (E2E_ADMIN_EMAIL/PASSWORD)
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
| 2026-11-14 | Bug caught: global Mongoose `sanitizeFilter` broke `$in`/`$gte` queries → removed, documented in SECURITY.md | fixed |

## Environment notes
- `B:\` drive root is itself a git repo (owned by SYSTEM). This project has its own repo at `B:\ecommerce-platform`.
- Node 24.22.1, pnpm 10.19.0.
