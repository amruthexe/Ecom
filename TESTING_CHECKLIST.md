# Testing Checklist

Tools: **Vitest** (unit + integration, `mongodb-memory-server` replica set), **Playwright** (E2E, Chromium + mobile viewports: iPhone 13, Pixel 7, iPad). No real payments. Razorpay is mocked in unit/integration tests and uses test-mode keys and test cards in manual E2E.

Legend: ☐ not started · ◐ in progress · ☑ passing

## Unit
- ☐ Pricing: subtotal, sale price vs MRP, variant prices, rounding in paise
- ☐ Coupons: percentage, fixed, max cap, min order, expiry, usage limit, per-user limit, inactive
- ☐ Shipping: flat rate, free-shipping threshold
- ☐ Tax: inclusive vs exclusive
- ☐ Order state machine: allowed/forbidden transitions
- ☐ Razorpay payment signature verification (valid, tampered, wrong secret)
- ☐ Webhook signature verification on raw body
- ☐ Zod validators (address, product, coupon)

## Integration
- ☐ Auth: register, login, logout, blocked user
- ☐ Admin authorization: every admin action rejects customer/anonymous
- ☐ Ownership: customer A cannot read customer B's order/address
- ☐ Product CRUD + archive + safe category delete
- ☐ Upload signing: admin only, params restricted
- ☐ Stock availability check at checkout
- ☐ Checkout ignores client-sent prices
- ☐ finalizePaidOrder: deducts stock once, even when called concurrently/twice
- ☐ Duplicate webhook event → processed once
- ☐ Webhook before verify, verify before webhook → same final state
- ☐ Payment failed → order `payment_failed`, retry creates new Razorpay order
- ☐ Out-of-stock at capture → auto-refund path
- ☐ Refund: full, partial, over-refund rejected, `refund.processed` webhook
- ☐ Cancel → restock + InventoryTransaction
- ☐ Rate limiter

## E2E (Playwright)
- ☐ Browse → search → filter → product → add to cart → checkout (guest) → mocked payment success
- ☐ Logged-in checkout with saved address → my-orders shows order
- ☐ Payment failed page → retry
- ☐ Admin: create product with images → visible on storefront
- ☐ Admin: update order status → customer sees it
- ☐ Mobile: no horizontal overflow on all main routes; nav drawer; cart drawer
- ☐ 404 and error pages

## Manual (Razorpay test mode)
- ☐ Test card success, failure, UPI test, netbanking test
- ☐ Webhook delivery via tunnel (ngrok/cloudflared) to local
- ☐ Refund from admin reflects in Razorpay dashboard

## Results log
_(filled after each phase)_
