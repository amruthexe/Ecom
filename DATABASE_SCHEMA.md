# Database Schema (MongoDB / Mongoose)

> Status: **Proposed (Phase 0)**. All money fields are integers in **paise**. All collections have `createdAt`/`updatedAt` timestamps.

## User *(managed by Better Auth; extended fields)*
| Field | Type | Notes |
|---|---|---|
| name | string, required | |
| email | string, required, lowercase | **unique index** |
| emailVerified | boolean | |
| phone | string | E.164 |
| role | enum `customer` \| `staff` \| `owner` | default `customer`, index. `owner` = full access + manages staff |
| permissions | string[] (staff only) | e.g. `products`, `categories`, `orders`, `payments`, `refunds`, `customers`, `coupons`, `inventory`, `analytics`, `settings`. Owner implicitly has all |
| createdBy | ObjectId → User | which owner created this staff account |
| status | enum `active` \| `blocked` | blocked users cannot log in or checkout |
| wishlist | ObjectId[] → Product | |
| defaultAddressId | ObjectId → Address | |

Sessions/accounts/verification collections are owned by Better Auth.

## Address
`userId` (index), `fullName`, `phone`, `line1`, `line2`, `landmark`, `city`, `state`, `postalCode` (6-digit IN PIN, validated), `country` (default `IN`), `isDefault`.

## Category
`name` (req), `slug` (**unique**), `description`, `image {url, publicId}`, `parentId` (optional, for sub-categories), `sortOrder`, `isActive`.
Safe delete: blocked if any product references it (admin must reassign), otherwise soft-delete.

## Product
| Field | Type | Notes |
|---|---|---|
| name | string, req | text index |
| slug | string | **unique** |
| description / shortDescription | string (sanitized rich text) | |
| categoryId | ObjectId → Category | index |
| tags | string[] | index |
| images | `[{url, publicId, alt, width, height, order}]` | `featuredImageIndex` or first item = featured |
| priceMrpPaise | int ≥ 0 | regular price |
| salePricePaise | int ≥ 0, ≤ mrp | optional |
| sku | string | **unique (sparse)** when no variants |
| stock | int ≥ 0 | when no variants |
| lowStockThreshold | int | default from settings |
| variants | `[{_id, sku (unique), options:{size?, color?}, pricePaise?, salePricePaise?, stock, images?}]` | |
| status | enum `draft` \| `active` \| `archived` | index |
| isFeatured | boolean | index |
| ratingAvg / ratingCount / soldCount | numbers | denormalized for listing/sort |

Indexes: `{status, categoryId, createdAt}`, `{status, soldCount}`, text index on `name, tags, description`, `variants.sku` unique sparse.

## Cart
`userId` (unique, sparse) **or** `guestId` (unique, sparse, cookie), `items:[{productId, variantId?, qty}]`, `couponCode?`, TTL index on `updatedAt` for guest carts (30 days). Prices are **not** stored. They are always computed live.

## Order
| Field | Notes |
|---|---|
| orderNumber | human-readable, **unique** (e.g. `ORD-2026-000123`) |
| userId? / guestEmail? | one required; index on userId |
| guestAccessTokenHash | for guest order tracking links |
| items | **snapshots**: `{productId, variantId, name, sku, image, options, unitPricePaise, qty, lineTotalPaise}` |
| pricing | `{subtotalPaise, discountPaise, shippingPaise, taxPaise, totalPaise, currency}` |
| couponSnapshot | `{code, type, value}` |
| shippingAddress | embedded snapshot (not reference) |
| contact | `{name, email, phone}` |
| status | enum, see ARCHITECTURE §3, index |
| paymentStatus | `pending` \| `paid` \| `failed` \| `refunded` \| `partially_refunded` |
| statusHistory | `[{status, at, by, note}]` |
| shipping | `{note?, trackingNumber?, shippedAt, deliveredAt}`. Entered manually by admin; no courier integration |
| stockDeducted | boolean (guard against double deduction) |
| idempotencyKey | unique sparse |
| expiresAt | for pending_payment cleanup |

Indexes: `{status, createdAt}`, `{userId, createdAt}`, `{paymentStatus, createdAt}`.

## Payment
`orderId` (index), `razorpayOrderId` (**unique**), `razorpayPaymentId` (unique sparse), `razorpaySignature`, `amountPaise`, `currency`, `status` (`created|authorized|captured|failed|refunded|partially_refunded`), `method`, `errorCode`, `errorDescription`, `attempts` (retries), `refunds:[{razorpayRefundId, amountPaise, status, reason, createdBy, at}]`, `raw` (sanitized last gateway payload).

## Coupon
`code` (**unique**, uppercase), `type` (`percentage|fixed`), `value`, `maxDiscountPaise?`, `minOrderPaise`, `startsAt`, `expiresAt`, `usageLimit`, `usageCount`, `perUserLimit`, `isActive`. Usage increment is atomic and only on paid orders.

## Review
`productId` (index), `userId`, `orderId` (verified purchase), `rating 1–5`, `title`, `body`, `status` (`pending|approved|rejected`). Unique `{productId, userId}`.

## InventoryTransaction
`productId`, `variantId?`, `sku`, `change` (±int), `reason` (`order|cancel|refund_restock|manual_adjust|initial`), `orderId?`, `actorId?`, `balanceAfter`, `note`. Index `{productId, createdAt}`. Append-only.

## StoreSettings *(singleton, `key: "default"` unique)*
`storeName` (default "Vevvion"), `logo {url, publicId}`, `contact {email, phone, address}`, `social {instagram, facebook, x, youtube}`, `banners:[{image, title, subtitle, ctaText, ctaLink, order, active}]`, `homepageSections`, `shipping {flatRatePaise, freeShippingThresholdPaise}`, `tax {ratePercent, gstin}` (prices are always GST-inclusive), `currency` (`INR`), `notifications {orderEmails, lowStockEmails, adminEmail}`, `lowStockThreshold`, `pendingOrderTtlMinutes`.

## WebhookEvent
`eventId` (**unique**, from `x-razorpay-event-id`), `event` (type), `payloadHash`, `status` (`received|processed|failed`), `error`, `processedAt`. TTL 90 days optional.

## Additional (supporting)
- **AuditLog**: `actorId`, `action`, `entity`, `entityId`, `diff`, `ip`, `at`. Index `{entity, entityId}`, `{actorId, at}`.
- **RateLimit**: `key` (unique), `count`, `expiresAt` (TTL index).
- **Counter**: for sequential order numbers (atomic `$inc`).
