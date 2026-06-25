# VC — cafe.sql Delta & Cutover Readiness

**New dump:** `cafe.sql` (phpMyAdmin Jun 23, 2026)
**Baseline:** localhost.sql (Jun 15, 2026) — embedded `vonomglk_cafe`
**Audit:** [VC_AUDIT.md](./VC_AUDIT.md)

---

## 1. Row-count delta

| Metric | Baseline | cafe.sql | Delta |
|---|---:|---:|---:|
| transactions | 4,812 | 4,985 | +173 |
| sell (type) | 4,226 | 4,384 | +158 |
| sell + final (computed) | 4,138 | 4,382 | +244 |
| transaction_sell_lines | 7,258 | 7,514 | +256 |
| transaction_payments | 4,847 | 4,977 | +130 |
| account_transactions | 3,558 | 3,680 | +122 |
| contacts | 51 | 53 | +2 |
| products | 59 | 59 | +0 |

| Max `transaction_date` | 2026-06-18 | 2026-06-23 | +5 days |
| Transactions on/after 2026-06-15 | — | 265 | import scope |

---

## 2. Revenue tie-out (legacy MySQL)

| Check | Amount (NGN) |
|---|---:|
| SUM(`final_total`) sell + final | ₦4,383,609.35 |
| SUM(`transaction_payments.amount`) on sell/final txns | ₦4,291,121.20 |
| **Delta** | **₦92,488.15** |

**Tie-out:** Expected gap — 385 sell rows due/partial; migration uses `final_total`, not payment rows

**Payment status on sells:** paid=4,560, due=348, partial=37

**Postgres baseline** (after Jun 15 delta import): 4,224 sales, ₦4241976.56 revenue.

---

## 3. Duplicate risk signals

- Duplicate `invoice_no` groups: **0**
- Dedupe preview (Postgres `tenant_vc_001`): **0** customers, **0** duplicate account transactions (prior execute run removed 3 + 13; current DB is clean)

---

## 4. Migration dry-run

### Full import (`cafe.sql`, no `--since`)

```json
{
  "items": 59,
  "customers": 49,
  "suppliers": 4,
  "sales": 4382,
  "saleLines": 7511,
  "stockMovements": 0,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 4564,
  "paymentAccounts": 3,
  "accountTransactions": 3659,
  "payments": 4977,
  "productCategories": 8,
  "brands": 0,
  "productUnits": 2,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "legacyIdRows": 9543,
  "auditLogs": 0
}
```

### Incremental (`--since 2026-06-15`)

```json
{
  "items": 0,
  "customers": 2,
  "suppliers": 0,
  "sales": 158,
  "saleLines": 256,
  "stockMovements": 0,
  "jobs": 0,
  "jobMaterials": 0,
  "jobLabours": 0,
  "ledgerEntries": 165,
  "paymentAccounts": 0,
  "accountTransactions": 197,
  "payments": 130,
  "productCategories": 0,
  "brands": 0,
  "productUnits": 0,
  "warranties": 0,
  "sellingPriceGroups": 0,
  "legacyIdRows": 290,
  "auditLogs": 0
}
```

---

## 5. Cutover verdict

### **GO**

- Schema unchanged (70 Ultimate POS tables, known transaction types only)
- Row deltas consistent with ~5 days of cafe operations since Jun 18 baseline
- Legacy payment vs sale-total gap explained by due/partial POS sales; migration uses `final_total`
- Dedupe preview shows no pending duplicates in Postgres

**Next operator steps:** freeze legacy POS → `migrate_all.py --dump cafe.sql --entities VC --write --confirm-all` → prod smoke test → staff use `app.vonosautos.com/VC` (no `cafe.vonosautos.com` redirect).
