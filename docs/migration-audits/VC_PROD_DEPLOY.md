# Vonos Cafe — Production deploy & T−0 runbook

Production URL: **https://app.vonosautos.com/VC**

## 1. Railway services

| Service | Root | Build | Start |
|---------|------|-------|-------|
| API | `apps/api` | `npm run build` | `npm run start:prod` |
| Web | `apps/web` | `npm run build` | `npm run start` |

### API environment

```
DATABASE_URL=<Neon Postgres URL>
JWT_SECRET=<strong secret>
WEB_ORIGIN=https://app.vonosautos.com
NODE_ENV=production
PORT=3001
# Mail (invites / password reset)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=noreply@vonosautos.com
```

### Web environment

```
NEXT_PUBLIC_API_URL=https://<api-service>.up.railway.app
NEXT_PUBLIC_SKIP_AUTH=false
NODE_ENV=production
```

CORS in `apps/api/src/main.ts` uses `WEB_ORIGIN` — must be exactly `https://app.vonosautos.com` (no trailing slash).

## 2. Sync VC tenant config on Neon

Removes `kitchen` from `enabledModules` and aligns nav with cutover target:

```bash
PYTHONPATH=scripts python3 scripts/sync_vc_tenant_config.py
# preview: add --dry-run
```

Timezone: app-wide date formatting uses `Africa/Lagos` (`apps/web/lib/utils/formatDate.ts`).

## 3. DNS

- `app.vonosautos.com` → Vonos web (Railway/Vercel custom domain)
- API: dedicated subdomain or Railway public URL referenced by `NEXT_PUBLIC_API_URL`
- **`cafe.vonosautos.com`:** leave unchanged — **no redirect** to Vonos (staff bookmark `app.vonosautos.com/VC`)

## 4. Staff invites (blocker B3)

Legacy Ultimate POS users:

| Email | Name | Suggested role |
|-------|------|----------------|
| admin@vonosautomarket.com | Vonos Autos | admin |
| victoria@vonosautos.com | Victoria Ejima | staff |

After API is live with production `WEB_ORIGIN`:

```bash
VONOS_API_URL=https://<api-host> \
VC_INVITER_EMAIL=admin@vc.vonos \
VC_INVITER_PASSWORD=<prod password> \
python3 scripts/invite_vc_staff.py
```

Or use **Users → Invite** in `/VC/users`.

## 5. T−0 cutover checklist

| Step | Action |
|------|--------|
| T−7 | Staff training on `app.vonosautos.com/VC` |
| T−1 | Freeze legacy POS; export fresh `vonomglk_cafe` from phpMyAdmin |
| T−0 | `migrate_all.py --dump <fresh.sql> --entities VC --write --confirm-all` |
| T−0 | Verify counts + ledger tie-out; `python3 scripts/vc_smoke_test.py` against prod API |
| T−0 | Staff switch to `app.vonosautos.com/VC` — **no** `cafe.vonosautos.com` redirect |
| T+7 | Optional: legacy maintenance/read-only on cPanel; keep MySQL snapshot |
| T+30 | Decommission cPanel cafe hosting (no redirect required) |

### Legacy domain (no redirect)

Do **not** add Cloudflare, cPanel, or DNS rules that send `cafe.vonosautos.com` to Vonos. Train staff on the new URL instead.

### Rollback (7 days)

Restore `cafe.vonosautos.com` DNS to cPanel; reconcile any Vonos-only sales manually.

## 6. Secret rotation (blocker B7)

If `cafe_backup.zip` was shared:

- Rotate MySQL password on cPanel (`vonomglk_cafe`)
- Rotate legacy `APP_KEY` if site stays up briefly
- Never commit production `.env` files

## 7. Validation commands

### T−0 full import (`cafe.sql`, Jun 23 2026)

```bash
# Audit
python3 scripts/audit_mysql_dump.py cafe.sql docs/migration-audits
python3 scripts/vc_cafe_delta.py

# Dry-run
PYTHONPATH=scripts python3 scripts/migrate_all.py \
  --dump cafe.sql --entities VC --dry-run

# Production import (after freeze)
PYTHONPATH=scripts python3 scripts/migrate_all.py \
  --dump cafe.sql --entities VC --write --confirm-all

# Categories (if needed after import)
PYTHONPATH=scripts python3 scripts/backfill_vc_categories.py --dump cafe.sql

# Dedupe + smoke
python3 scripts/dedupe_vc.py --tenant-code VC --execute --confirm-tenant VC
python3 scripts/vc_smoke_test.py
```

### Staging delta (historical — Jun 16)

```bash
PYTHONPATH=scripts python3 scripts/migrate_all.py \
  --dump "localhost (1).sql" --entities VC --since 2026-06-15 --write --confirm-all

PYTHONPATH=scripts python3 scripts/backfill_vc_categories.py --dump "localhost (1).sql"
```
