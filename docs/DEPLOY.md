# Vonos production setup (low traffic)

**Stack:** Neon (Postgres) + Railway (API) + Vercel (web)

Estimated cost for internal use: **~$0–25/mo** (Neon free/Launch + Railway Hobby + Vercel Hobby).

> **Staging / beta:** Use a separate Neon DB + Railway Staging environment + Vercel staging project on a `staging` branch so beta work never touches production. Full guide: **[ENVIRONMENTS.md](./ENVIRONMENTS.md)**.

---

## Overview

```
Browser → Vercel (Next.js) → Railway (NestJS API) → Neon (Postgres)
```

| Service | What runs there |
|---------|-----------------|
| **Neon** | PostgreSQL — all tenant data |
| **Railway** | `apps/api` — NestJS + Prisma |
| **Vercel** | `apps/web` — Next.js frontend |

Do **not** deploy the API to Vercel serverless for production (reports and Prisma need a long-running process). Railway config is in `railway.toml`.

---

## 1. Neon (database)

1. Sign up at [neon.tech](https://neon.tech).
2. Create a project (e.g. `vonos-prod`), region **EU (London)** or closest to Lagos.
3. Copy the **pooled** connection string (`?sslmode=require`):
   ```
   postgresql://USER:PASS@ep-xxx-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Apply migrations (from your machine, once):

   ```bash
   cd apps/api
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   DATABASE_URL="postgresql://..." npx prisma db seed
   ```

   Seed creates tenants + admin logins only. Business data comes from migration imports.

---

## 2. Railway (API)

1. Sign up at [railway.app](https://railway.app) — **Hobby** plan is enough for low traffic.
2. **New Project** → **Deploy from GitHub** → connect this repo (`vonos` or `vonos-backend`).
3. **Service settings:**
   - **Root directory:** leave empty (repo root) — uses `/railway.toml`
   - Or set **Config file path** to `railway.toml`
4. **Variables** (Railway → API service → Variables):

   | Variable | Value |
   |----------|--------|
   | `DATABASE_URL` | Neon pooled URL from step 1 |
   | `JWT_SECRET` | `openssl rand -base64 32` |
   | `JWT_ACCESS_EXPIRES` | `2h` |
   | `JWT_REFRESH_EXPIRES` | `7d` |
   | `WEB_ORIGIN` | Your Vercel URL (step 3), e.g. `https://vonos-web.vercel.app` |
   | `NODE_ENV` | `production` |

5. Deploy. Railway runs `npm run start:railway` which:
   - runs `prisma migrate deploy`
   - starts `node dist/main`

6. Note the public URL, e.g. `https://vonos-backend-production.up.railway.app`
7. Verify: `curl https://YOUR-API.up.railway.app/health` → `{"status":"ok"}` (or similar)

### Redis cache (required for warm performance)

Add these Railway environment variables in both staging and production:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Without these values, the API falls back to in-memory cache and every restart
causes a full cold cache.

Verification (as a super admin token):

```bash
curl -H "Authorization: Bearer <JWT>" \
  "https://YOUR-API.up.railway.app/overview/cache/stats"
```

Expected response should include:

```json
{ "backend": "redis", "keyCount": 123 }
```

---

## Performance smoke checklist (post-deploy)

Run these as a tenant admin with a bounded date range (`last_30_days`):

1. Finance overview — `/ledger/summary` + `/ledger/charts` load without timeout.
2. Profit & Loss — `/reports/run?reportId=profit-loss&mode=pl-core`, then two `pl-breakdown` tabs.
3. List pages — sales page 1 and customers page 1 return in under 2s cold.
4. Suppliers list — facets (purchase due / status) filter in SQL via rollup columns.
5. After `20260716140000_supplier_rollups_and_search`, run once:
   `npx ts-node --transpile-only prisma/scripts/backfill-supplier-rollups.ts`

**SLO targets (warm cache):**

| Endpoint | p95 target |
|----------|------------|
| `pl-core` | < 3s cold, < 500ms warm |
| `pl-breakdown` tab | < 1s cold, < 200ms cached |
| `ledger/summary` | < 1s warm |

---

## 3. Vercel (web)

1. Sign up at [vercel.com](https://vercel.com) — **Hobby** is fine for low traffic.
2. **Add New Project** → import GitHub repo.
3. **Root Directory:** `apps/web`
4. Framework should auto-detect **Next.js**. Build uses `apps/web/vercel.json`:
   - Install: `cd ../.. && npm install`
   - Build: builds `@vonos/types` then `web`
5. **Environment variables:**

   | Variable | Value |
   |----------|--------|
   | `NEXT_PUBLIC_API_URL` | Railway API URL (no trailing slash), e.g. `https://vonos-backend-production.up.railway.app` |
   | `NEXT_PUBLIC_SKIP_AUTH` | `false` |

6. Deploy. Note the URL, e.g. `https://vonos-web-xxx.vercel.app`

---

## 4. Wire web ↔ API

1. In **Railway**, set `WEB_ORIGIN` to your **exact** Vercel URL (and custom domain when added):
   ```
   https://vonos-web-xxx.vercel.app
   ```
   Comma-separate multiple origins if needed:
   ```
   https://vonos-web-xxx.vercel.app,https://app.vonosautos.com,https://app.vonosautosmarket.com
   ```

2. Redeploy Railway after changing `WEB_ORIGIN` (CORS).

3. In **Vercel**, confirm `NEXT_PUBLIC_API_URL` points at Railway. Redeploy web if you change it.

---

## 5. Custom domain (optional)

| Host | Point to |
|------|----------|
| `app.vonosautos.com` | Vercel project → Domains |
| `app.vonosautosmarket.com` | Vercel project → Domains (VSP / marketplace) |
| API subdomain (optional) | Railway → Settings → Networking → Custom Domain |

Update `WEB_ORIGIN` and `NEXT_PUBLIC_API_URL` accordingly. Comma-separate multiple frontends, e.g.:
```
https://app.vonosautos.com,https://app.vonosautosmarket.com
```
(no trailing slashes)

---

## 6. Smoke test

1. Open `https://YOUR-VERCEL-URL/login`
2. Log in with a seeded admin (see `apps/api/prisma/seed.ts`), e.g. `admin@vag.vonos` / seed password
3. Open Reports → Profit/Loss for a tenant with data
4. API health: `GET /health`

---

## 7. Local dev (unchanged)

```bash
docker compose up -d
cp .env.example .env
# apps/web/.env.local → NEXT_PUBLIC_API_URL=http://localhost:3001
cd apps/api && npx prisma migrate dev && npx prisma db seed
cd ../.. && npm run dev
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors in browser | `WEB_ORIGIN` on Railway must match the browser URL exactly (no trailing slash) |
| API 502 on Railway | Check deploy logs; ensure `DATABASE_URL` is Neon **pooler** URL |
| P2024 pool timeout | API should be on Railway, not Vercel serverless; reduce report concurrency (already tuned) |
| Web can't reach API | `NEXT_PUBLIC_API_URL` must be set on Vercel and app redeployed |
| Schema out of date | `cd apps/api && DATABASE_URL=... npx prisma migrate deploy` |

---

## What not to use for this repo

- **API on Vercel** — `apps/api/vercel.json` exists for experiments only; use Railway for prod.
- **Postgres on Railway** — optional; Neon is already configured and cheaper for low traffic.
- **Railway Pro** — not required until you need team features or higher limits.
