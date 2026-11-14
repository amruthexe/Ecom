# Project Status — Vevvion

_Last updated: 2026-11-14_

## Current phase: **Phase 1 complete** → next: Phase 2 (design system & storefront)

| Phase | Status |
|---|---|
| 0. Requirements analysis, architecture, docs | ☑ Done |
| 1. Project setup & architecture | ☑ Done |
| 2. Design system & storefront | ☐ Next |
| 3. MongoDB & models | ☐ |
| 4. Auth, owner/staff roles & authorization | ☐ |
| 5. Admin dashboard | ☐ |
| 6. Product & category management | ☐ |
| 7. Image management (Cloudinary/ImageKit) | ☐ |
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

## Decisions
See CLAUDE.md → "Owner decisions" and "Still open".

## Waiting on owner
- **Razorpay**: keys in `.env.local` are LIVE and were rejected (HTTP 401). Need `rzp_test_` key id + secret from Dashboard (Test Mode) → API Keys, and a strong webhook secret
- **Owner password**: `OWNER_SEED_PASSWORD` must be at least 8 characters
- **Resend**: key valid but no verified domain, so use `onboarding@resend.dev` until a domain is verified
- Recommended: create a dedicated DB user instead of `doadmin`

## Known bugs
None.

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

## Environment notes
- `B:\` drive root is itself a git repo (owned by SYSTEM). This project has its own repo at `B:\ecommerce-platform`.
- Node 24.22.1, pnpm 10.19.0.
