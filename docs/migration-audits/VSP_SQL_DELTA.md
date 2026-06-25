# VSP — SQL Delta & Cutover Readiness

**Entity:** VSP → `tenant_vsp_001`
**Legacy site:** vsp.vonosautomarket.com
**New dump:** `vonomglk_spmarket.sql` (Jun 23, 2026 export)
**Baseline:** `localhost (1).sql` embedded `vonomglk_spmarket` (Jun 18, 2026)
**Audit:** [VSP_AUDIT.md](./VSP_AUDIT.md)

---

## 1. Row-count delta

| Metric | Baseline | Current dump | Delta |
|---|---:|---:|---:|
| transactions | 1,381 | 1,381 | — |
| products | 1,204 | 1,204 | — |
| contacts | 86 | 86 | — |
| transaction_payments | 164 | 164 | — |
| account_transactions | 163 | 163 | — |
| transaction_sell_lines | 505 | 505 | — |
| sell + final (scanned) | 162 | 162 | — |

| Max `transaction_date` | — | 2026-06-18 | |
| Transactions on/after 2026-06-18 | — | 26 | import scope |

---

## 2. Revenue tie-out (legacy MySQL)

| Check | Amount (NGN) |
|---|---:|
| SUM(`final_total`) sell + final | ₦11,043,950.00 |
| SUM(`transaction_payments.amount`) on sell/final txns | ₦11,033,950.00 |
| **Delta** | **₦10,000.00** |

**Tie-out:** Review due/partial sells — migration uses `final_total`

---

## 3. Migration dry-run

```json
{
  "items": 1204,
  "customers": 86,
  "suppliers": 0,
  "sales": 162,
  "saleLines": 505,
  "stockMovements": 0,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 162,
  "paymentAccounts": 31,
  "accountTransactions": 159,
  "payments": 164,
  "productCategories": 39,
  "brands": 4,
  "productUnits": 3,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "legacyIdRows": 2897,
  "auditLogs": 0
}
```

---

## 4. Cutover verdict

### **NO-GO**

- Revenue tie-out delta ₦10,000.00 exceeds ₦1
