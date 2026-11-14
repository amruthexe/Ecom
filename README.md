# Vevvion

E-commerce storefront + admin portal. Next.js 16, MongoDB, Better Auth, Razorpay.

## Setup
```bash
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev                     # http://localhost:3000
```

## Scripts
| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` | Route type generation + `tsc` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |

## Docs
`CLAUDE.md` (working rules + decisions), `PROJECT_STATUS.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `API_DOCUMENTATION.md`, `SECURITY.md`, `TESTING_CHECKLIST.md`, `DEPLOYMENT_GUIDE.md`. The original brief is `CLAUDE.md.txt`.
