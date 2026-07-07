# VSP — SQL Delta & Cutover Readiness

**Entity:** VSP → `tenant_vsp_001`
**Expected dump:** `vonomglk_spmarket.sql`

> Dump file not found in repo — row-count scan skipped. Dry-run JSON below.

## Migration dry-run

```json
{
  "items": 1252,
  "customers": 120,
  "suppliers": 3,
  "sales": 264,
  "saleLines": 880,
  "stockMovements": 1296,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 1560,
  "paymentAccounts": 31,
  "accountTransactions": 255,
  "payments": 265,
  "productCategories": 39,
  "brands": 4,
  "productUnits": 3,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "expenseCategories": 36,
  "expenses": 0,
  "payrollGroups": 0,
  "payComponents": 0,
  "payrolls": 0,
  "legacyIdRows": 4565,
  "auditLogs": 0
}
```

