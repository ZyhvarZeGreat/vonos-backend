# VC — SQL Delta & Cutover Readiness

**Entity:** VC → `tenant_vc_001`
**Expected dump:** `vonomglk_cafe.sql`

> Dump file not found in repo — row-count scan skipped. Dry-run JSON below.

## Migration dry-run

```json
{
  "items": 0,
  "customers": 0,
  "suppliers": 0,
  "sales": 44,
  "saleLines": 81,
  "stockMovements": 410,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 649,
  "paymentAccounts": 0,
  "accountTransactions": 3932,
  "payments": 41,
  "productCategories": 0,
  "brands": 0,
  "productUnits": 0,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "expenseCategories": 0,
  "expenses": 195,
  "payrollGroups": 0,
  "payComponents": 0,
  "payrolls": 0,
  "legacyIdRows": 690,
  "auditLogs": 0
}
```

