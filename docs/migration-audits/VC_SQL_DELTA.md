# VC — SQL Delta & Cutover Readiness

**Entity:** VC → `tenant_vc_001`
**Expected dump:** `vonomglk_cafe.sql`

> Dump file not found in repo — row-count scan skipped. Dry-run JSON below.

## Migration dry-run

```json
{
  "items": 63,
  "customers": 50,
  "suppliers": 4,
  "sales": 4671,
  "saleLines": 8024,
  "stockMovements": 409,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 5273,
  "paymentAccounts": 3,
  "accountTransactions": 3898,
  "payments": 5387,
  "productCategories": 8,
  "brands": 0,
  "productUnits": 2,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "expenseCategories": 0,
  "expenses": 193,
  "payrollGroups": 0,
  "payComponents": 0,
  "payrolls": 0,
  "legacyIdRows": 10853,
  "auditLogs": 0
}
```

