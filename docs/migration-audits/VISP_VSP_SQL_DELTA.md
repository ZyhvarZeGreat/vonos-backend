# VISP — SQL Delta & Cutover Readiness

**Entity:** VISP → `tenant_visp_001`
**Expected dump:** `vonomglk_vsp.sql`

> Dump file not found in repo — row-count scan skipped. Dry-run JSON below.

## Migration dry-run

```json
{
  "items": 3,
  "customers": 2,
  "suppliers": 2,
  "sales": 10,
  "saleLines": 16,
  "stockMovements": 19,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 33,
  "paymentAccounts": 7,
  "accountTransactions": 3102,
  "payments": 31,
  "productCategories": 0,
  "brands": 0,
  "productUnits": 0,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "expenseCategories": 0,
  "expenses": 4,
  "payrollGroups": 0,
  "payComponents": 0,
  "payrolls": 0,
  "legacyIdRows": 81,
  "auditLogs": 0
}
```

