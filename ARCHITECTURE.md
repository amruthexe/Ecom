# Architecture

> Status: **Proposed (Phase 0)** — awaiting owner approval before Phase 1.

## 1. High-level overview

```
 Browser (customer / admin)
   │  React Server Components + small client islands (cart, gallery, forms, charts)
   ▼
 Next.js App Router on Vercel (Node.js runtime for all DB/payment code)
   ├── app/(store)/**        customer storefront (RSC, cached reads)
   ├── app/admin/**          admin portal (dynamic, role-guarded layout + per-action checks)
   ├── app/api/**            Route Handlers: webhooks, uploads signing, checkout, auth
   ├── server actions        admin/customer mutations (validated with Zod, authorized inside)
   └── src/server/**         business logic (services), never imported by client code
          │
          ├── MongoDB Atlas (Mongoose)  ── replica set → multi-document transactions
          ├── Better Auth (Mongo adapter) ── sessions, password hashing, roles
          ├── Razorpay (Orders API, Checkout.js, Webhooks, Refunds)
          └── Cloudinary (signed direct uploads, optimized delivery)
```

## 2. Key decisions (recommended)

| Area | Decision | Reason |
|---|---|---|
| Framework | **Next.js 16.4.6** (pinned), React 19.3, App Router, TypeScript `strict`, **Cache Components enabled**: session reads live inside `<Suspense>`; catalog reads use `'use cache'` + `cacheTag` and are revalidated on admin mutations | Required by spec |
| Runtime | Node.js runtime for every route touching Mongo, Razorpay, crypto | Mongoose and `crypto` HMAC are not Edge-compatible |
| Auth | **Better Auth** with its MongoDB adapter, email+password, `role` field (`customer` \| `admin`), DB sessions in httpOnly cookies | Auth.js Credentials provider does not support DB sessions well and is more limited; Better Auth has first-class roles/admin plugin and rate limiting |
| Authorization | `requireUser()` / `requireAdmin()` helpers called **inside every** server action, route handler and admin page loader. Middleware/proxy only does an optimistic redirect | Spec §9: never rely on middleware alone |
| Data layer | Mongoose models in `src/server/models`, cached connection on `globalThis` | Avoid connection storms on serverless |
| Money | All amounts stored as **integers in paise** (`amountPaise`), currency `INR` | No float rounding errors; Razorpay uses paise |
| Validation | Zod schemas in `src/lib/validators`, shared by forms and server | Single source of truth |
| Mutations | Server Actions for admin/customer forms; Route Handlers for webhooks, upload signing, Razorpay order creation/verification | Webhooks need raw body; checkout needs explicit JSON API |
| Caching | Storefront product/category reads cached with tag-based revalidation (`revalidateTag('products')`) on admin mutations | Fast storefront, instant admin updates |
| Images | Cloudinary signed direct-from-browser upload (server signs, browser uploads with progress), store `{url, publicId, width, height, alt, order}` | Secret never leaves server; large files bypass Vercel 4.5 MB body limit |
| Payments | Razorpay Standard Checkout + Orders API + server signature verification + webhooks as source of truth | Spec §7 |
| Rate limiting | Mongo-backed fixed-window limiter (TTL-indexed `RateLimit` collection); swap-able for Upstash Redis | Works on serverless without an extra paid service. Upstash is better at scale |
| Charts | Recharts (admin only, client component) | Mature, small API |
| Animation | Framer Motion (`motion`), used sparingly; respects `prefers-reduced-motion` | Spec §3 |
| Email | Resend (transactional: order confirmation, status updates, password reset). Default; disabled if no key | Needed for notifications/password reset |
| Database host | **MongoDB on DigitalOcean** (owner decision) | Must be a replica set for transactions. TLS CA via `MONGODB_TLS_CA_CERT` |
| Roles | `owner` → creates `staff` with per-module permissions; `customer` | Owner decision |
| Shipping | Address captured + displayed; manual fulfilment, no courier API | Owner decision |
| Tax | GST-inclusive prices | Owner decision |
| Payments | Razorpay only, no COD | Owner decision |
| Testing | Vitest (unit/integration with `mongodb-memory-server` replica set), Playwright (E2E + mobile viewports) | Spec §12 |

## 3. Order & payment state machine

```
Order.status:  pending_payment ─▶ confirmed ─▶ processing ─▶ packed ─▶ shipped ─▶ delivered
                     │                │            │            │
                     ▼                └────────────┴────────────┴──▶ cancelled (refund if paid)
               payment_failed (retryable) / expired (after TTL, no stock was taken)

Payment.status: created ─▶ authorized ─▶ captured ─▶ (partially_)refunded
                      └──▶ failed
```

- Transitions are enforced by one function `transitionOrder(order, to, actor)` with an allow-list; every change appends to `order.statusHistory` and an `AuditLog` entry.
- `confirmed` is reached **only** after server verification (signature check on callback **and/or** `payment.captured` / `order.paid` webhook), with amount and currency matched against the stored order.

## 4. Payment flow (detailed)

1. Client posts `{ items:[{productId, variantId, qty}], couponCode, addressId|address, guestEmail? }` to `POST /api/checkout`.
2. Server re-reads products, validates stock, applies coupon, shipping and tax from `StoreSettings`, computes `totalPaise`. Client prices are ignored.
3. Server creates `Order(pending_payment)` with item snapshots + `Payment(created)`, then calls Razorpay `orders.create({amount, currency, receipt: order.number, notes:{orderId}})`. Stores `razorpayOrderId`. Idempotency key from the client avoids duplicate orders on double-click.
4. Client opens Checkout.js with the `razorpayOrderId` and the **public** key id only.
5. On success callback, client posts `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` to `POST /api/payments/verify`.
6. Server verifies `HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)` with constant-time compare, fetches the payment from Razorpay to confirm `status` + `amount`, then calls `finalizePaidOrder()`.
7. `POST /api/webhooks/razorpay` reads `await req.text()` (raw body), verifies `X-Razorpay-Signature` with `WEBHOOK_SECRET`, inserts `WebhookEvent{eventId}` (unique index → duplicates rejected idempotently), then runs the same `finalizePaidOrder()` / `markFailed()` / `applyRefund()`.
8. `finalizePaidOrder()` runs in a **Mongo transaction**: only proceeds if order is still `pending_payment` (atomic `findOneAndUpdate` with status guard), decrements stock with a conditional update `{stock: {$gte: qty}}`, writes `InventoryTransaction`s, increments coupon usage. Called twice → second call is a no-op. Prevents duplicate stock deductions.
9. If stock ran out between checkout and capture, the order goes to `cancelled` and an automatic full refund is issued (see open decision D3).
10. Abandoned `pending_payment` orders expire after a configurable TTL (e.g. 30 min) via a Vercel Cron job; late webhooks for expired orders still capture correctly or auto-refund.

## 5. Folder structure (proposed)

```
ecommerce-platform/
├── src/
│   ├── app/
│   │   ├── (store)/                 layout with header/footer
│   │   │   ├── page.tsx             homepage
│   │   │   ├── products/[slug]/
│   │   │   ├── categories/[slug]/
│   │   │   ├── cart/  checkout/  wishlist/
│   │   │   ├── payment/success/  payment/failed/
│   │   │   ├── my-orders/[id]/  account/
│   │   │   └── track-order/         guest order lookup
│   │   ├── (auth)/login  register  forgot-password
│   │   ├── admin/
│   │   │   ├── layout.tsx           requireAdmin()
│   │   │   ├── page.tsx             dashboard
│   │   │   ├── products/ categories/ orders/ payments/
│   │   │   ├── customers/ coupons/ inventory/ analytics/ settings/ audit-log/
│   │   ├── api/
│   │   │   ├── auth/[...all]/       Better Auth handler
│   │   │   ├── checkout/            create order + Razorpay order
│   │   │   ├── payments/verify/
│   │   │   ├── webhooks/razorpay/
│   │   │   ├── uploads/sign/        Cloudinary signature (admin only)
│   │   │   ├── search/suggest/
│   │   │   └── cron/expire-orders/
│   │   ├── not-found.tsx  error.tsx  global-error.tsx
│   ├── components/
│   │   ├── ui/                      Button, Input, Card, Badge, Dialog, Table, Sheet, Skeleton…
│   │   ├── store/                   ProductCard, Gallery, CartDrawer, Filters…
│   │   └── admin/                   DataTable, StatCard, ImageUploader, Charts…
│   ├── server/
│   │   ├── db.ts                    cached Mongoose connection
│   │   ├── models/                  one file per model
│   │   ├── services/                product, order, payment, inventory, coupon, pricing…
│   │   ├── auth.ts                  Better Auth config + requireUser/requireAdmin
│   │   ├── razorpay.ts  cloudinary.ts  rate-limit.ts  audit.ts
│   │   └── actions/                 server actions (thin: validate → authorize → service)
│   ├── lib/                         client-safe utils: money format, slugify, validators (Zod)
│   └── proxy.ts                     (Next 16 name for middleware) optimistic route guard only
├── tests/  unit/ integration/ e2e/
├── scripts/seed.ts  create-admin.ts
└── docs (*.md at root as required by spec)
```

## 6. Architectural risks

| Risk | Mitigation |
|---|---|
| Serverless connection exhaustion | Global cached connection (`src/server/db.ts`), `maxPoolSize` 10 |
| Transactions need replica set | DigitalOcean **Managed** MongoDB is a replica set. A standalone `mongod` on a droplet is not, so it must be started with `--replSet`. Tests use `MongoMemoryReplSet` |
| DigitalOcean "Trusted sources" blocks Vercel (dynamic IPs) | Either host the app on a DO droplet/App Platform (can be added as a trusted source) or leave trusted sources open and rely on strong credentials + TLS |
| Webhook and client verify race | Both call the same idempotent `finalizePaidOrder()` with status guard |
| Vercel 4.5 MB request body limit | Direct browser→Cloudinary signed uploads |
| Stale storefront prices after admin edit | Tag revalidation; checkout always recomputes server-side |
| Next.js major-version churn (middleware→proxy, async params) | Pin versions at Phase 1, follow official upgrade docs |
| Auth library maturity | Better Auth pinned; abstract behind `src/server/auth.ts` so it can be swapped |
| Scope size (13 phases) | Phase gates with tests; PROJECT_STATUS.md updated each phase |
