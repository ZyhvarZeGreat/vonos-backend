# VW — SQL Delta & Cutover Readiness

**Entity:** VW → `tenant_vw_001`
**Expected dump:** `Vonos warehouse.sql`

> Dump file not found in repo — row-count scan skipped. Dry-run JSON below.

## Migration dry-run

```json
{
  "items": 645,
  "customers": 2,
  "suppliers": 0,
  "sales": 0,
  "saleLines": 0,
  "stockMovements": 267,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 267,
  "paymentAccounts": 0,
  "accountTransactions": 0,
  "payments": 253,
  "productCategories": 10,
  "brands": 1,
  "productUnits": 2,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "expenseCategories": 0,
  "expenses": 0,
  "payrollGroups": 0,
  "payComponents": 0,
  "payrolls": 0,
  "legacyIdRows": 1825,
  "auditLogs": 0
}
```

