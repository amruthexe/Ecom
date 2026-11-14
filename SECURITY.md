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
| Malicious uploads | Signed Cloudinary uploads only for admins; allowed formats `jpg,png,webp,avif`, max 5 MB, folder-locked signature, short timestamp window |
| NoSQL injection | Zod validation + Mongoose `sanitizeFilter`/`strictQuery`; never pass raw query objects |
| Secret leakage | Secrets only in server env vars; only `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` are public; `server-only` import guard on server modules |
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
