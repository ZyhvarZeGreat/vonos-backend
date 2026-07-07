# Vonos

Multi-tenant operations platform for Vonos Group (8 entities, one codebase).

## Docs

- [AGENTS.md](./AGENTS.md) — product + architecture source of truth
- [FRONTEND.md](./FRONTEND.md) — Next.js implementation plan
- [BACKEND.md](./BACKEND.md) — NestJS + Prisma implementation plan
- [docs/migration-pipeline.md](./docs/migration-pipeline.md) — deferred WP/SQL migration

## Structure

```
apps/web     Next.js frontend + design system
apps/api     NestJS API + Prisma
packages/types  Shared TypeScript + Zod contracts
```

## Quick start

```bash
# Install dependencies
npm install

# Build shared types
npm run build --workspace=@vonos/types

# Start Postgres
docker compose up -d

# Copy env
cp .env.example .env

# Apply migrations + seed (tenants + admin logins only; business tables empty)
cd apps/api
npx prisma migrate dev
npx prisma db seed
cd ../..

# Dev (web + api via Turborepo)
npm run dev
```

**Seed scope:** `prisma db seed` bootstraps the 8 tenants, `tenantConfig`, and core admin accounts only (`admin@vonos.test`, `admin@vag.vonos`, per-entity admins). Inventory, jobs, customers, finance ledger rows, and other business tables stay empty until you add real data or run the WordPress migration import.

**Fresh local wipe:** `cd apps/api && npx prisma migrate reset` drops all Postgres data, reapplies migrations, and re-runs seed. Use only on local dev — it removes any migration imports already written.

- Web: http://localhost:3000
- Design system: http://localhost:3000/dev/design-system
- Config playground: http://localhost:3000/dev/config-playground
- API health: http://localhost:3001/health

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` in `apps/web/.env.local` so the web app talks to the NestJS API.

## Phase 1 status

- Monorepo scaffolded
- Shared types + Zod `TenantConfig`
- Design tokens + atoms/molecules/organisms/templates
- NestJS API + Prisma (multi-tenant)
- Warehouse + entity pages wired to live API

**Next:** Continue entity rollout per AGENTS.md Phase 2.

## Deploy (production)

**Low-traffic stack:** Neon (DB) + Railway (API) + Vercel (web).

Full step-by-step: **[docs/DEPLOY.md](./docs/DEPLOY.md)**

Quick reference:

| Service | Root / config |
|---------|----------------|
| Neon | Postgres — `DATABASE_URL` for API |
| Railway | Repo root — `railway.toml` |
| Vercel | `apps/web` — `apps/web/vercel.json` |

**API env:** `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `NODE_ENV=production`  
**Web env:** `NEXT_PUBLIC_API_URL` (Railway URL), `NEXT_PUBLIC_SKIP_AUTH=false`
