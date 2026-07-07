# VISP — SQL Delta & Cutover Readiness

**Entity:** VISP → `tenant_visp_001`
**Legacy site:** visp.vonosautomarket.com
**New dump:** `vonomglk_vsp.sql` (Jun 23, 2026 export)
**Baseline:** `localhost (1).sql` embedded `vonomglk_vsp` (Jun 18, 2026)
**Audit:** [VISP_AUDIT.md](./VISP_AUDIT.md)

---

## 1. Row-count delta

| Metric | Baseline | Current dump | Delta |
|---|---:|---:|---:|
| transactions | 5,434 | 5,350 | -84 |
| products | 2,543 | 2,540 | -3 |
| contacts | 4,810 | 4,799 | -11 |
| transaction_payments | 3,055 | 3,032 | -23 |
| account_transactions | 3,050 | 3,027 | -23 |
| transaction_sell_lines | 18,567 | 18,474 | -93 |
| sell + final (scanned) | 3,038 | 3,092 | +54 |

| Max `transaction_date` | — | 2026-07-09 | |
| Transactions on/after 2026-06-18 | — | 243 | import scope |

---

## 2. Revenue tie-out (legacy MySQL)

| Check | Amount (NGN) |
|---|---:|
| SUM(`final_total`) sell + final | ₦373,030,370.00 |
| SUM(`transaction_payments.amount`) on sell/final txns | ₦371,640,970.00 |
| **Delta** | **₦1,389,400.00** |

**Tie-out:** Review due/partial sells — migration uses `final_total`

---

## 3. Migration dry-run

```json
{
  "items": 2554,
  "customers": 4703,
  "suppliers": 133,
  "sales": 3092,
  "saleLines": 18742,
  "stockMovements": 2476,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 5572,
  "paymentAccounts": 38,
  "accountTransactions": 3102,
  "payments": 3142,
  "productCategories": 39,
  "brands": 4,
  "productUnits": 3,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "expenseCategories": 36,
  "expenses": 4,
  "payrollGroups": 31,
  "payComponents": 0,
  "payrolls": 0,
  "legacyIdRows": 18809,
  "auditLogs": 0
}
```

---

## 4. Cutover verdict

### **NO-GO**

- Revenue tie-out delta ₦1,389,400.00 exceeds ₦1
