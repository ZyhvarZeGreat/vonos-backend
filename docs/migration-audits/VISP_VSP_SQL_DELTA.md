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
| transactions | 5,434 | 5,466 | +32 |
| products | 2,543 | 2,543 | — |
| contacts | 4,810 | 4,814 | +4 |
| transaction_payments | 3,055 | 3,062 | +7 |
| account_transactions | 3,050 | 3,057 | +7 |
| transaction_sell_lines | 18,567 | 18,595 | +28 |
| sell + final (scanned) | 3,038 | 3,043 | +5 |

| Max `transaction_date` | — | 2026-06-23 | |
| Transactions on/after 2026-06-18 | — | 134 | import scope |

---

## 2. Revenue tie-out (legacy MySQL)

| Check | Amount (NGN) |
|---|---:|
| SUM(`final_total`) sell + final | ₦367,095,670.00 |
| SUM(`transaction_payments.amount`) on sell/final txns | ₦366,957,670.00 |
| **Delta** | **₦138,000.00** |

**Tie-out:** Review due/partial sells — migration uses `final_total`

---

## 3. Migration dry-run

```json
{
  "items": 2543,
  "customers": 4682,
  "suppliers": 130,
  "sales": 3043,
  "saleLines": 18575,
  "stockMovements": 0,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 3043,
  "paymentAccounts": 31,
  "accountTransactions": 3027,
  "payments": 3062,
  "productCategories": 39,
  "brands": 4,
  "productUnits": 3,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "legacyIdRows": 16080,
  "auditLogs": 0
}
```

---

## 4. Cutover verdict

### **NO-GO**

- Revenue tie-out delta ₦138,000.00 exceeds ₦1
