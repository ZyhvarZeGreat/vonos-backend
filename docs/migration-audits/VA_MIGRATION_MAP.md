# VA — Field-Level Migration Map (unified automotive)

**Target entity:** Vonos Automotive (`VA`, tenant id `tenant_va_001`)  
**Canonical sources:** two legacy Ultimate POS installs merged into one tenant:

| Former code | MySQL database | Job reference prefix |
|-------------|----------------|----------------------|
| VM (retired) | `vonomglk_Quotation` | `VM-` |
| VMS (retired) | `vonomglk_OPS` | `VMS-` |

**Supersedes:** [VM_MIGRATION_MAP.md](./VM_MIGRATION_MAP.md), [VMS_MIGRATION_MAP.md](./VMS_MIGRATION_MAP.md)  
**Archetype:** job-centric (+ vehicles, requisitions)

---

## 1. Scope

Same transforms as VM/VMS (`job_transforms.py`, `stock_transforms.py` where applicable).

### In scope

| Source table(s) | Vonos target |
|---|---|
| `contacts` (customer) | `Customer` |
| `contacts` (supplier) | `Supplier` |
| `products`, `variations`, … | `Item` |
| `transactions` (job candidates) | `Job` |
| `transaction_sell_lines` | `JobMaterial` / `JobLabour` |
| Revenue / expense transactions | `LedgerEntry` |
| `activity_log` | `AuditLog` |
| All migrated entities | `MigrationLegacyId` |

### Legacy ID namespacing

When importing **both** sources into `tenant_va_001`:

- Use `reference_prefix` `VM-` for Quotation, `VMS-` for OPS (already applied in ETL).
- Offset OPS `MigrationLegacyId.legacyId` and `AuditLog.legacyLogId` by `+10_000_000` before merge (see `prisma/scripts/merge-vm-vms-into-va.ts`).

### Out of scope

Same as former VM/VMS maps: FIFO link table, HR/users (re-invite), `expense_refund` edge cases.

---

## 2. Import order

1. `Tenant` (`code: VA`, `archetype: job`).
2. Customers, suppliers, items.
3. Jobs → materials/labour → ledger.
4. `MigrationLegacyId`, audit logs.
5. Run merge script if importing sources separately into VM/VMS first, **or** import both directly to `tenant_va_001` with prefixes/offsets above.

---

## 3. Operator notes

- One Neon tenant holds ~9.6k combined jobs (post-merge).
- Customer dedupe across former installs is **not** automatic — same person may appear twice until a cleanup pass.
- URLs `/VM/*` and `/VMS/*` redirect to `/VA/*` in the web app.
