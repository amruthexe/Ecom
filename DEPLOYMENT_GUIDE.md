# Deployment Guide

> Status: **Draft**. Completed in Phase 13.

## Environment variables
All names are in **`.env.example`**. Copy it to `.env.local` and fill in values. `.env.local` is git-ignored.

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Base URL, e.g. `https://vevvion.com` |
| `NEXT_PUBLIC_STORE_NAME` | public | `Vevvion` |
| `MONGODB_URI` | server | DigitalOcean MongoDB connection string |
| `MONGODB_DB_NAME` | server | Optional if the DB name is in the URI |
| `MONGODB_TLS_CA_CERT` | server | DO CA certificate PEM contents (`\n` for newlines) |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | server | Auth secret (≥32 chars) / base URL |
| `OWNER_SEED_NAME` / `OWNER_SEED_EMAIL` / `OWNER_SEED_PASSWORD` | local | Used once by `pnpm create-owner` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | server | `rzp_test_…` first |
| `RAZORPAY_WEBHOOK_SECRET` | server | From Razorpay Dashboard → Webhooks |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | public | Same as the key id |
| `IMAGE_PROVIDER` | server | `cloudinary` or `imagekit` |
| `CLOUDINARY_*`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | server/public | If Cloudinary |
| `IMAGEKIT_*`, `NEXT_PUBLIC_IMAGEKIT_*` | server/public | If ImageKit |
| `RESEND_API_KEY` / `EMAIL_FROM` | server | Optional, enables emails |
| `CRON_SECRET` | server | Protects `/api/cron/*` |

## MongoDB on DigitalOcean
- **Managed MongoDB** (recommended): it's a replica set, so transactions work. Download the CA certificate from the DO dashboard and put its contents in `MONGODB_TLS_CA_CERT`. Use the connection string with `tls=true&authSource=admin&replicaSet=…`, and create a dedicated database user (not `doadmin`) for the app.
- **Self-hosted `mongod` on a droplet**: it must run as a replica set (`--replSet rs0` + `rs.initiate()`), otherwise orders and payments cannot use transactions. Enable auth and TLS, and firewall the port.
- **Trusted sources**: Vercel uses dynamic IPs. Either host the app on DigitalOcean (App Platform or droplet) and add it as a trusted source, or allow all sources and rely on credentials + TLS.

## Steps (outline)
1. Fill `.env.local`, run `pnpm install`, `pnpm build`.
2. Run `pnpm create-owner` once to create the owner account (available from Phase 4).
3. **Razorpay (test mode)**: add the webhook `https://<domain>/api/webhooks/razorpay` with events `payment.authorized, payment.captured, payment.failed, order.paid, refund.processed, refund.failed`.
4. **Hosting**: Vercel (or DigitalOcean App Platform). Set the env vars and the cron job for `/api/cron/expire-orders`.
5. Run the full TESTING_CHECKLIST against staging with test keys.
6. Only then switch to live Razorpay keys + a live webhook secret.
