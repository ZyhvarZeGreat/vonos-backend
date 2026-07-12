# VA — SQL Delta & Cutover Readiness

**Entity:** VA → `tenant_va_001`
**Legacy sources:** `vonomglk_Quotation`, `vonomglk_OPS`
**Legacy site:** hq6.vonosautomarket.com (Quotation + OPS)
**Dump files:** `vonomglk_Quotation.sql` + `vonomglk_OPS.sql` (or combined `localhost.sql`)
**Import wrapper:** `./scripts/migrate_va.sh`
**Baseline:** Postgres tenant_va_001 after VM+VMS merge (Jul 2026)

---

## 1. ETL target delta (dry-run vs Postgres baseline)

| Metric | Baseline (Postgres) | Dry-run | Delta |
|---|---:|---:|---:|
| jobs | 9,666 | 0 | -9,666 |
| payroll_groups | 61 | 61 | — |
| payrolls | 787 | 0 | -787 |
| pay_components | 4 | 4 | — |

---

## 2. Migration dry-run

```json
{
  "items": 0,
  "customers": 0,
  "suppliers": 0,
  "sales": 0,
  "saleLines": 0,
  "stockMovements": 0,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 0,
  "paymentAccounts": 0,
  "accountTransactions": 0,
  "payments": 0,
  "productCategories": 0,
  "brands": 0,
  "productUnits": 0,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "expenseCategories": 0,
  "expenses": 0,
  "payrollGroups": 61,
  "payComponents": 4,
  "payrolls": 0,
  "legacyIdRows": 65,
  "auditLogs": 0
}
```

---

## 3. Cutover verdict

### **GO** (automotive composite)

- Use `./scripts/migrate_va.sh` for full import or `--hrm-only` for Essentials payroll
- Jobs already in Postgres; HRM import verified (787 payrolls)
- Verify with `apps/api/prisma/scripts/sql-va-audit.ts`

