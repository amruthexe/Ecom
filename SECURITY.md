# Security

> Status: **Proposed (Phase 0)**.

## Threats & controls

| Risk | Control |
|---|---|
| Admin route/API reached by non-admin | `requireAdmin()` inside every admin action, handler and page loader. Middleware is UX only |
| IDOR on orders/addresses | Every query filters by `userId` from the session (or verified guest token hash). Never use an ID from the client alone |
| Price/amount tampering | Server recomputes all prices, discounts, shipping, tax. Client totals ignored. Razorpay amount comes from DB |
| Fake payment success | Order marked paid only after HMAC signature verification **and** gateway amount/status check, or a verified webhook |
| Webhook forgery/replay | HMAC-SHA256 over the **raw body** with `RAZORPAY_WEBHOOK_SECRET`, `timingSafeEqual`, unique `eventId` |
| Double stock deduction / overselling | Status-guarded atomic transition + `stockDeducted` flag + conditional `$inc` with `stock >= qty`, inside a transaction |
| Credential stuffing / brute force | Rate limits on login, register, reset, checkout, verify, coupon apply. Generic auth error messages |
| Password storage | Better Auth hashing (scrypt); min length 8, breached-password check optional |
| Session theft | httpOnly, Secure, SameSite=Lax cookies; session rotation on login; logout invalidates server session |
| CSRF | Server Actions have built-in origin checks; Better Auth origin checks; JSON APIs require same-origin |
| XSS | React escaping. Rich-text product descriptions sanitized server-side (allow-list); strict CSP headers |
| Malicious uploads | ImageKit signed uploads, signature issued only to staff with products/categories permission (10-min expiry, single-use token, rate-limited); client checks jpg/png/webp/avif ≤ 5 MB; server only accepts image URLs from our own ImageKit endpoint |
| NoSQL injection | Zod validation to primitives before any query, `strictQuery`, user regex input escaped; raw request objects never used as filters (global `sanitizeFilter` intentionally off: it breaks server-built `$in`/`$gte` operators) |
| Secret leakage | Secrets only in server env vars; only `NEXT_PUBLIC_RAZORPAY_KEY_ID` and the ImageKit public key + URL endpoint are public; `server-only` import guard on server modules |
| Error leakage | Central error mapper; stack traces only in server logs |
| Accountability | `AuditLog` for product/price/stock/order status/refund/settings/customer status changes |
| Blocked customers | Checked at login and checkout |

## Payment-specific risks
- Webhook arriving before/after the client verify call → shared idempotent finalizer.
- Payment captured for an expired/cancelled order → auto-refund + admin alert.
- Partial refunds over the paid amount → server validates the cumulative refund total.
- Test vs live keys mixed → env check at boot; admin UI shows a "TEST MODE" banner when key starts with `rzp_test_`.
- Currency/amount mismatch → reject and flag for manual review.

## Environment variables
See `DEPLOYMENT_GUIDE.md`. `.env.local` is git-ignored; `.env.example` holds names only.
