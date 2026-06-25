
# Vonos API (NestJS + Prisma)

Backend for the Vonos multi-tenant platform. Deployed on Vercel as a serverless Express handler.

## Railway

Import [vonos-backend](https://github.com/ZyhvarZeGreat/vonos-backend) with **Root Directory** left empty (repo root).

In **Service Settings → Config-as-code**, set the config file path to `/railway.toml`.

Required env vars:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (Neon/Railway) |
| `JWT_SECRET` | long random secret |
| `JWT_ACCESS_EXPIRES` | `15m` |
| `JWT_REFRESH_EXPIRES` | `7d` |
| `WEB_ORIGIN` | `https://app.vonosautos.com` |
| `NODE_ENV` | `production` |

Optional override if start command is ignored: `RAILPACK_START_CMD=npm run start:railway --workspace=api`

Health check: `GET /health`

## Vercel setup

Import [vonos-backend](https://github.com/ZyhvarZeGreat/vonos-backend) and set **Root Directory** to `apps/api`.

Required env vars:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | long random secret |
| `JWT_ACCESS_EXPIRES` | `15m` |
| `JWT_REFRESH_EXPIRES` | `7d` |
| `WEB_ORIGIN` | `https://app.vonosautos.com` |
| `NODE_ENV` | `production` |

Health check: `GET /health`
