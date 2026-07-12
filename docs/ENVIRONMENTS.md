# Vonos environments — dev, staging (beta), production

Use **three isolated stacks** so beta work never touches production data or users.

```
                    Branch          Web (Vercel)        API (Railway)       Database (Neon)
                    ──────          ────────────        ─────────────       ───────────────
Local dev           feature/*       localhost:3000      localhost:3001      Docker Postgres
Staging / beta      staging         beta.*.vercel.app   vonos-api-staging   vonos-staging
Production          main            app.* (prod URL)  vonos-api-prod      vonos-prod
```

**Rule:** each environment gets its own `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, and `NEXT_PUBLIC_API_URL`. Never share a database between staging and production.

---

## 1. Git branch strategy

| Branch | Purpose | Auto-deploys to |
|--------|---------|-----------------|
| `main` | Production — only merge tested, signed-off work | Prod Vercel + Prod Railway |
| `staging` | Beta / UAT — safe place to try features with real-ish data | Staging Vercel + Staging Railway |
| `feature/*` | Development | Local only (optional Vercel Preview per PR) |

### Create the staging branch (once)

```bash
git checkout main
git pull
git checkout -b staging
git push -u origin staging
```

**Workflow for beta:**

1. Merge or cherry-pick feature work into `staging` (not `main`).
2. Staging auto-deploys — testers use the beta URL.
3. When ready for production, open a PR `staging` → `main` and merge after review.

Production stays on `main` until you explicitly merge.

---

## 2. Neon — separate databases

Create **two** Neon projects (or one project with two databases). Do **not** point staging at the production connection string.

| Neon project | Used by | Suggested name |
|--------------|---------|----------------|
| Production | `main` Railway | `vonos-prod` |
| Staging | `staging` Railway | `vonos-staging` |

Local dev continues to use Docker (`docker compose up -d`).

### Bootstrap staging DB (once)

```bash
cd apps/api

# Staging — apply schema + seed (tenants + admin logins only)
DATABASE_URL="postgresql://...staging-pooler...?sslmode=require" npx prisma migrate deploy
DATABASE_URL="postgresql://...staging-pooler...?sslmode=require" npx prisma db seed
```

Optional: refresh staging from a prod snapshot using Neon **branching** or a one-off `pg_dump` / restore — only when you intentionally want prod-like data on beta. Never run destructive migrations on prod from staging scripts.

---

## 3. Railway — two API environments

In one Railway project, use **Environments** (Production + Staging).

1. Railway project → **Environments** → create **Staging**.
2. Duplicate the API service into Staging (or link the same repo with branch-specific deploys).

### Per-environment settings

| Setting | Production | Staging |
|---------|------------|---------|
| **Deploy branch** | `main` | `staging` |
| **Config file** | `railway.toml` (repo root) | same |
| `DATABASE_URL` | Neon **prod** pooler URL | Neon **staging** pooler URL |
| `JWT_SECRET` | unique prod secret | **different** staging secret |
| `WEB_ORIGIN` | prod Vercel URL(s) | staging/beta Vercel URL |
| `NODE_ENV` | `production` | `production` |

Generate secrets:

```bash
openssl rand -base64 32   # run twice — one for prod, one for staging
```

### Branch → environment mapping

Railway → each environment → Service → **Settings** → **Source**:

- Production environment: watch branch **`main`**
- Staging environment: watch branch **`staging`**

Pushing to `staging` redeploys only the staging API. Pushing to `main` redeploys only production.

Note each environment’s public URL, e.g.:

- Prod: `https://vonos-api-production.up.railway.app`
- Staging: `https://vonos-api-staging.up.railway.app`

Verify: `curl https://YOUR-STAGING-API.up.railway.app/health`

---

## 4. Vercel — web environments

One Vercel project for `apps/web` with environment-scoped variables.

### Production branch

Project → **Settings** → **Git** → **Production Branch** = `main`.

### Environment variables

Project → **Settings** → **Environment Variables**:

| Variable | Production (`main`) | Preview (PRs) | Staging branch |
|----------|---------------------|---------------|----------------|
| `NEXT_PUBLIC_API_URL` | Prod Railway URL | Staging Railway URL (or skip previews) | Staging Railway URL |
| `NEXT_PUBLIC_SKIP_AUTH` | `false` | `false` | `false` |

**Staging-only vars:** In Vercel, you can scope variables to a specific Git branch (`staging`) under **Environment Variables** → add variable → enable only for that branch, or use Vercel’s custom environment if on Pro.

Simpler approach for beta:

1. Add a **second Vercel project** `vonos-web-staging` connected to the same repo, root `apps/web`, production branch = `staging`.
2. Set `NEXT_PUBLIC_API_URL` to the **staging** Railway URL only in that project.

That gives a stable beta URL (e.g. `https://vonos-web-staging.vercel.app`) without PR previews clutter.

### Wire CORS on staging API

On **staging** Railway, set:

```
WEB_ORIGIN=https://vonos-web-staging.vercel.app
```

Redeploy the staging API after changing `WEB_ORIGIN`.

---

## 5. Environment variable cheat sheet

Copy templates from the repo:

- [`.env.example`](../.env.example) — local dev
- [`.env.staging.example`](../.env.staging.example) — staging reference (do not commit real secrets)
- [`.env.production.example`](../.env.production.example) — production reference

| Variable | Where set | Prod | Staging | Local |
|----------|-----------|------|---------|-------|
| `DATABASE_URL` | Railway | Neon prod | Neon staging | `localhost:5432` |
| `JWT_SECRET` | Railway | prod secret | staging secret | dev secret |
| `WEB_ORIGIN` | Railway | prod web URL | beta web URL | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Vercel / `.env.local` | prod API | staging API | `http://localhost:3001` |
| `NODE_ENV` | Railway / Vercel | `production` | `production` | `development` |

---

## 6. Day-to-day commands

### Local development (unchanged)

```bash
docker compose up -d
cp .env.example .env
cp .env.example apps/web/.env.local   # adjust NEXT_PUBLIC_API_URL if needed
cd apps/api && npx prisma migrate dev && npx prisma db seed
cd ../.. && npm run dev
```

### Deploy beta feature

```bash
git checkout staging
git merge feature/my-feature   # or cherry-pick
git push origin staging
# → staging Railway + staging Vercel redeploy automatically
```

### Promote beta to production

```bash
# Open PR: staging → main on GitHub
# After merge, only production redeploys
```

### Run migrations on staging before prod

```bash
cd apps/api
DATABASE_URL="<staging-url>" npx prisma migrate deploy
# test on beta URL
DATABASE_URL="<prod-url>" npx prisma migrate deploy   # only after staging sign-off
```

---

## 7. Optional: Vercel Preview for pull requests

PR previews are useful for UI review but use a **staging** API and DB, never production:

- Set Preview-scoped `NEXT_PUBLIC_API_URL` to the **staging** Railway URL.
- Or disable preview deployments: Vercel → Settings → Git → uncheck “Automatic Preview Deployments” if previews are confusing.

---

## 8. Optional: custom domains

| Host | Environment |
|------|-------------|
| `app.vonosautos.com` | Production (Vercel prod project, `main`) |
| `beta.vonosautos.com` | Staging (Vercel staging project, `staging`) |
| `api.vonosautos.com` | Production Railway |
| `api-staging.vonosautos.com` | Staging Railway |

Update `WEB_ORIGIN` and `NEXT_PUBLIC_API_URL` when domains go live.

---

## 9. Checklist — first-time setup

- [ ] Neon: create `vonos-staging` database (separate from prod)
- [ ] Railway: create Staging environment, deploy branch `staging`
- [ ] Railway: set staging env vars (`DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`)
- [ ] Railway staging: run `prisma migrate deploy` + `db seed` against staging DB
- [ ] Vercel: staging web project (or branch-scoped vars), `NEXT_PUBLIC_API_URL` → staging API
- [ ] Git: create and push `staging` branch
- [ ] Smoke test: login on beta URL with seeded staging admin (e.g. `admin@vag.vonos`)
- [ ] Confirm prod URL still serves `main` only and uses prod DB

---

## 10. What stays isolated

| Concern | Isolated? |
|---------|-----------|
| Database rows | Yes — separate Neon URLs |
| Auth tokens | Yes — different `JWT_SECRET` per env |
| API deploys | Yes — branch-linked Railway environments |
| Web deploys | Yes — separate Vercel project or branch |
| User-facing URL | Yes — beta subdomain vs prod |

Merging to `staging` does **not** change production until you merge `staging` → `main`.

---

## Related docs

- [DEPLOY.md](./DEPLOY.md) — initial production setup
- [AGENTS.md](../AGENTS.md) — architecture overview
