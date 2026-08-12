---
name: postgres-sql-audit
description: >-
  Audit Vonos Nest/Prisma SQL ($queryRaw, reports, ledger, overview) against
  Chion Iron Laws and anti-patterns. Use when the user asks to audit SQL,
  check query safety, review reports aggregators, or wire Chion.
---

# Postgres SQL Audit (Vonos + Chion)

## When to use

- Full or partial audit of `apps/api` raw SQL / analytics queries
- Before shipping new `$queryRaw` report/ledger/overview SQL
- When validating time windows, ratios, snapshots, or LIMIT discipline

## Source of truth

1. Read `.claude/CHION.md` (or `postgres-claude-skills-generator/CHION.md`) §§4–6.
2. Skill tree (Northwind mock until Vonos export): `.claude/skills/_INDEX.md`.
3. Vonos runtime SQL lives in `apps/api/src/**` — Prisma `$queryRaw` / `Prisma.sql`.

**Important:** The bundled `skills/` tree is a **Northwind mock**. Do not treat its `query.sql` as Vonos schema. Use Chion **process + Iron Laws** to audit Vonos queries; generate a Vonos-specific export via chion.ai against Neon when ready.

## Audit checklist (stop on fail)

| Gate | Fail if |
|------|---------|
| L1 read-only | `$executeRaw` mutates analytics paths without explicit ops intent; multi-statement |
| L2 unsafe | `$queryRawUnsafe` / string-concat SQL |
| Time | `col >= from AND col <= to` on timestamps (prefer half-open `>= from AND < end`) |
| BETWEEN | `BETWEEN` on timestamptz |
| Ratio | `AVG(rate)` / average of margins without reconstructing num/den |
| Snapshot | `SUM` of on-hand inventory across days without `DISTINCT ON` / latest |
| Series | `date_trunc` series without deterministic `ORDER BY` + bounded window / LIMIT |
| Fanout | join multiplies rows then `SUM` without pre-aggregate grain |
| Soft-delete | missing `"deletedAt" IS NULL` on tenant business tables |
| Tenant | missing `tenantId` (or VAG explicit multi-tenant `IN`) |

## Output format

Produce a markdown report:

1. Inventory (call-site counts by file)
2. Findings table: severity · path · Iron Law / anti-pattern · evidence · fix
3. Priority fix list (top 5)
4. Note whether Chion Vonos export is still pending

Do not mutate verified Chion `query.sql`. For Vonos fixes, prefer half-open windows in `date-utils` + report aggregators.
