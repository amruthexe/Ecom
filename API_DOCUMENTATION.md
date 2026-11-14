# API Documentation

> Status: **Proposed (Phase 0)**. Admin and customer mutations are mostly **Server Actions** (listed below). Route Handlers are used where an HTTP API is needed (webhooks, payment, uploads, search, auth, cron).
> Every protected endpoint/action checks auth **inside the handler** (`requireUser` / `requireAdmin`). All input is validated with Zod. Errors return `{ error: { code, message } }` without leaking internals.

## Route Handlers

| Method & path | Auth | Rate-limited | Purpose |
|---|---|---|---|
| `GET/POST /api/auth/[...all]` | public | yes (login/register/reset) | Better Auth endpoints |
| `POST /api/checkout` | user or guest | yes | Recompute prices, create pending Order + Payment + Razorpay order. Returns `{orderId, razorpayOrderId, amountPaise, keyId}` |
| `POST /api/payments/verify` | owner of order (or guest token) | yes | Verify Razorpay signature, fetch payment, finalize order |
| `POST /api/payments/retry` | owner | yes | New Razorpay order for a `payment_failed` order (re-validates stock/prices) |
| `POST /api/webhooks/razorpay` | Razorpay signature | — | Raw-body HMAC verify. Handles `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`. Idempotent |
| `POST /api/uploads/sign` | admin | yes | Returns Cloudinary `{signature, timestamp, folder, apiKey, cloudName}` with restricted params |
| `GET /api/search/suggest?q=` | public | yes | Top 8 product/category suggestions |
| `GET /api/cart` / `PUT /api/cart` | user or guest cookie | yes | Get/replace cart with live prices |
| `GET /api/orders/track?number=&email=` | public | yes | Guest order tracking |
| `GET /api/cron/expire-orders` | `CRON_SECRET` header | — | Expire stale pending orders |
| `GET /api/admin/export/orders.csv` | admin | — | Order export |

## Server Actions (by module)

**Storefront/customer** (`requireUser` unless noted): `addToWishlist`, `removeFromWishlist`, `saveAddress`, `deleteAddress`, `setDefaultAddress`, `updateProfile`, `changePassword`, `applyCoupon` (guest OK), `submitReview` (verified purchase), `subscribeNewsletter` (public).

**Admin** (`requireAdmin`, audit-logged):
- Products: `createProduct`, `updateProduct`, `archiveProduct`, `deleteProduct` (only if never ordered), `reorderImages`, `setFeaturedImage`, `toggleProductStatus`
- Categories: `createCategory`, `updateCategory`, `deleteCategory` (safe)
- Orders: `updateOrderStatus` (state machine), `addTrackingInfo`, `cancelOrder`, `initiateRefund` (full/partial, server calls Razorpay Refunds API)
- Customers: `setCustomerStatus` (block/unblock)
- Coupons: `createCoupon`, `updateCoupon`, `toggleCoupon`, `deleteCoupon`
- Inventory: `adjustStock` (writes InventoryTransaction)
- Settings: `updateStoreSettings`, `updateBanners`
- Images: `deleteImage` (removes from Cloudinary + DB)

## Read paths (Server Components, no public API)
Product listing/filters/pagination, product detail, category pages, my-orders, admin tables and analytics aggregations are read directly through `src/server/services/*` in server components.
