# BACKEND.md — Implementation Plan

Companion to `AGENTS.md`. This document is the backend-specific
implementation plan: NestJS module structure, Prisma schema shape,
multi-tenancy enforcement, and the build sequence aligned with the frontend
phases. Written for NestJS + PostgreSQL + Prisma + Railway Pro.

---

## 1. Project Structure

```
/src
  /modules
    /auth
      auth.module.ts
      auth.service.ts
      auth.controller.ts
      strategies/jwt.strategy.ts
      guards/roles.guard.ts
      guards/tenant.guard.ts
    /tenants
      tenants.module.ts
      tenants.service.ts
      tenants.controller.ts          -> tenantConfig CRUD (VAG only for write)
    /users
      users.module.ts
      users.service.ts
      users.controller.ts             -> invite, list, role updates
    /items
      items.module.ts
      items.service.ts
      items.controller.ts
    /jobs
      jobs.module.ts
      jobs.service.ts
      jobs.controller.ts              -> includes status-advance endpoint
    /ledger
      ledger.module.ts
      ledger.service.ts
      ledger.controller.ts            -> finance/P&L endpoints
    /notifications
      notifications.module.ts
      notifications.service.ts
      notifications.controller.ts
    /vehicles                          -> Mechanics-specific (Phase 2)
    /appointments                      -> Saloon-specific (Phase 2)
    /requisitions                      -> deferred (Section 15 of AGENTS.md)

  /common
    /prisma
      prisma.service.ts
      prisma.extensions.ts            -> $extends for tenant auto-scoping
      soft-delete.middleware.ts
    /decorators
      current-user.decorator.ts
      roles.decorator.ts
    /interceptors
      tenant-scope.interceptor.ts
    /filters
      http-exception.filter.ts
    /utils
      pagination.ts                   -> cursor-based pagination helper

  app.module.ts
  main.ts

/prisma
  schema.prisma
  /migrations
  seed.ts
  /seeds
    seedStockCentricTenant.ts
    seedTransactionCentricTenant.ts
    seedJobCentricTenant.ts
    seedAppointmentCentricTenant.ts
```

---

## 2. Prisma Schema — Core Models (Phase 1 scope)

Mirrors `/types` from FRONTEND.md exactly — field names and enums must
match so the frontend's mock-to-real swap is a drop-in replacement.

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["clientExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  super_admin
  admin
  manager
  staff
  viewer
}

enum UserStatus {
  invited
  active
  suspended
}

enum Archetype {
  stock
  transaction
  job
  appointment
}

enum StockStatus {
  in_stock
  low_stock
  out_of_stock
}

enum LedgerEntryType {
  revenue
  cost
  expense
}

model Tenant {
  id          String    @id @default(cuid())
  code        String    @unique          // VM, VW, VSS, VMS, VC, VS, VKW
  name        String
  archetype   Archetype
  config      Json                       // tenantConfig: navItems, kpiCards, terminology, enabledModules
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  users        User[]
  items        Item[]
  jobs         Job[]
  ledgerEntries LedgerEntry[]
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  name         String
  role         Role
  status       UserStatus @default(invited)
  tenantId     String?                    // null for super_admin
  tenant       Tenant?    @relation(fields: [tenantId], references: [id])
  createdAt    DateTime   @default(now())
  lastLoginAt  DateTime?
  deletedAt    DateTime?

  @@index([tenantId])
}

model Item {
  id           String      @id @default(cuid())
  tenantId     String
  tenant       Tenant      @relation(fields: [tenantId], references: [id])
  sku          String
  name         String
  category     String?
  quantity     Int         @default(0)
  binLocation  String?
  reorderPoint Int?
  costPrice    Decimal
  currency     String      @default("NGN")
  status       StockStatus @default(in_stock)
  // Kids Wear variant matrix: stored as JSON on the item or as a separate
  // ItemVariant model — TBD when Kids Wear (Phase 2) is scoped.
  availableForRetail Boolean @default(false) // used by Spare Shop catalog query
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?

  @@index([tenantId])
  @@index([tenantId, status])
}

model Job {
  id           String    @id @default(cuid())
  tenantId     String
  tenant       Tenant    @relation(fields: [tenantId], references: [id])
  reference    String    @unique          // e.g. VMS-0042
  description  String
  status       String                     // jobStatus vocabulary value
  hasQuote     Boolean   @default(false)  // drives adaptive stepper
  quoteAmount  Decimal?
  customerName String?
  vehicleId    String?                    // Mechanics only, Phase 2
  assignedStaffIds String[]               // multi-select staff
  dueDate      DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  materials    JobMaterial[]
  labourEntries JobLabour[]

  @@index([tenantId])
  @@index([tenantId, status])
}

model JobMaterial {
  id        String   @id @default(cuid())
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id])
  itemId    String?                       // links to Item if sourced from Warehouse
  name       String
  quantity   Decimal
  unitCost   Decimal
  totalCost  Decimal
  source     String?                      // "warehouse" | "own_stock"
  createdAt  DateTime @default(now())
}

model JobLabour {
  id        String   @id @default(cuid())
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id])
  staffId   String
  hours     Decimal
  rate      Decimal
  totalCost Decimal
  createdAt DateTime @default(now())
}

model LedgerEntry {
  id           String          @id @default(cuid())
  tenantId     String
  tenant       Tenant          @relation(fields: [tenantId], references: [id])
  type         LedgerEntryType
  amount       Decimal
  currency     String          @default("NGN")
  category     String
  description  String
  linkedRecordType String?      // "job" | "item" | "sale" | etc.
  linkedRecordId   String?
  date         DateTime
  createdAt    DateTime        @default(now())
  deletedAt    DateTime?

  @@index([tenantId])
  @@index([tenantId, date])
  @@index([tenantId, type])
}

model Notification {
  id          String   @id @default(cuid())
  tenantId    String?                     // null = global/super_admin notification
  userId      String?                      // null = broadcast to tenant
  type        String
  title       String
  message     String
  severity    String                       // success | warning | error | info
  linkedRecordType String?
  linkedRecordId   String?
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([tenantId])
  @@index([userId])
}
```

> Phase 2 models (`Vehicle`, `Appointment`, `Requisition`, `ItemVariant`,
> `Order`, `OrderModifier`, etc.) are intentionally excluded from Phase 1
> schema — add as their respective entities are scoped, per AGENTS.md
> Section 16.

---

## 3. Multi-Tenancy Enforcement

### 3.1 Prisma Client Extension (auto-scoping)

```ts
// common/prisma/prisma.extensions.ts
import { Prisma } from "@prisma/client";

export function tenantScopedClient(tenantId: string | null) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          if (tenantId !== null) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async findFirst({ args, query }) {
          if (tenantId !== null) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async create({ args, query }) {
          if (tenantId !== null) {
            args.data = { ...args.data, tenantId };
          }
          return query(args);
        },
        // update/delete follow the same pattern
      },
    },
  });
}
```

- `tenantId === null` (VAG/super_admin) → no `where` injection, runs
  unscoped.
- Otherwise → every query automatically scoped. Service methods never need
  to manually pass `tenantId` in `where` clauses — removes the #1 risk of
  cross-tenant leakage.
- Instantiate this extended client per-request via a request-scoped provider
  (NestJS `REQUEST` scope) reading `tenantId` from the validated JWT.

### 3.2 Postgres RLS (defense-in-depth)

```sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON items
  USING (tenant_id = current_setting('app.tenant_id', true)::text
         OR current_setting('app.tenant_id', true) = '');
```

- At the start of each request/transaction, run:
  ```sql
  SET app.tenant_id = '<tenantId or empty string for VAG>';
  ```
- Apply the same policy to every tenant-scoped table (`items`, `jobs`,
  `ledger_entries`, etc.).
- This catches any query that bypasses the Prisma extension (raw SQL,
  future bugs, migrations run manually).

### 3.3 Tenant Guard + Roles Guard

```ts
// common/guards/tenant.guard.ts
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const { tenantId, role } = req.user; // from JwtStrategy
    req.tenantId = role === "super_admin" ? null : tenantId;
    return true;
  }
}
```

```ts
// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<Role[]>("roles", context.getHandler());
    if (!required) return true;
    const { role } = context.switchToHttp().getRequest().user;
    return required.includes(role);
  }
}
```

Usage:
```ts
@Roles("admin", "super_admin")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Patch(":id")
updateItem(...) { ... }
```

### 3.4 Soft Delete Middleware

```ts
// common/prisma/soft-delete.middleware.ts
prisma.$use(async (params, next) => {
  if (params.action === "delete") {
    params.action = "update";
    params.args.data = { deletedAt: new Date() };
  }
  if (params.action === "deleteMany") {
    params.action = "updateMany";
    params.args.data = { deletedAt: new Date() };
  }
  if (["findMany", "findFirst", "findUnique"].includes(params.action)) {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
  }
  return next(params);
});
```

Applies to every model with a `deletedAt` field — written once, applies
globally.

---

## 4. Auth Module

- **JWT payload**: `{ sub: userId, tenantId: string | null, role: Role }`
- **Endpoints**:
  - `POST /auth/login` — email/password → access + refresh tokens
  - `POST /auth/refresh` — refresh token (httpOnly cookie) → new access token
  - `POST /auth/forgot-password` → sends reset email
  - `POST /auth/reset-password` → token + new password
  - `POST /auth/invite/accept` → invite token + new password → activates
    user
  - `POST /auth/2fa/setup`, `POST /auth/2fa/verify` — TOTP, required for
    `admin`/`super_admin`
- **Users module**:
  - `POST /users/invite` — Admin invites within own tenant; Super Admin can
    invite for any tenant (specify `tenantId` in body)
  - `GET /users` — tenant-scoped list (auto via Prisma extension)
  - `PATCH /users/:id/role` — Admin only, own tenant
  - `PATCH /users/:id/status` — suspend/reactivate

---

## 5. Core Endpoints (Phase 1)

### Tenants
- `GET /tenants/:id/config` — returns `tenantConfig` (validated against same
  Zod-equivalent shape as frontend)
- `PATCH /tenants/:id/config` — Admin/Super Admin only

### Items (Warehouse Phase 1)
- `GET /items` — tenant-scoped, supports `?status=&category=&cursor=&limit=`
  (cursor-based pagination per AGENTS.md Section 9)
- `GET /items/:id`
- `POST /items` — create (mode="create" on frontend)
- `PATCH /items/:id` — update, including stock adjustments
- `GET /items/kpi-summary` — returns `{ totalSku, todayInbound,
  todayOutbound, stockValue }` for Warehouse Overview KPI Row

### Inbound / Outbound / Transfers
- Modeled as `Job`-like records with `movementStatus`, or a dedicated
  `StockMovement` model — **decide during Phase 1 build**: if these don't
  need materials/labour sub-records, a lighter `StockMovement` model
  (id, tenantId, type: inbound|outbound|transfer, reference, items: Json,
  status, date) is simpler than reusing `Job`.
- `GET /stock-movements?type=inbound|outbound|transfer`
- `GET /stock-movements/:id`
- `PATCH /stock-movements/:id/status` — status-advance endpoint

### Suppliers
- `GET /suppliers`, `GET /suppliers/:id`, `POST /suppliers`,
  `PATCH /suppliers/:id`

### Ledger / Finance
- `GET /ledger?type=&category=&from=&to=&cursor=`
- `POST /ledger` — manual expense entry
- `GET /ledger/summary?from=&to=` — returns `{ revenue, costs, net,
  outstanding }` for Finance KPI Row
- `GET /ledger/pnl?groupBy=category|month` — for P&L Chart Panel

### Notifications
- `GET /notifications` — tenant + user scoped
- `PATCH /notifications/:id/read`

---

## 6. Cursor-Based Pagination Helper

```ts
// common/utils/pagination.ts
export function buildCursorQuery(cursor?: string, limit = 20) {
  return {
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  };
}
```

Used in every `findMany` for `items`, `jobs`, `ledgerEntries`,
`notifications`.

---

## 7. Seed Strategy

Per AGENTS.md Section 17 — seed scripts parameterized by **archetype**, not
per tenant:

```ts
// prisma/seeds/seedStockCentricTenant.ts
export async function seedStockCentricTenant(tenant: Tenant) {
  // creates N items with realistic SKU/quantity/cost data
  // creates stock movements (inbound/outbound)
  // creates ledger entries reflecting stock valuation
}
```

`prisma/seed.ts` calls the appropriate seed function per tenant based on its
`archetype`:

```ts
const tenants = await prisma.tenant.findMany();
for (const tenant of tenants) {
  switch (tenant.archetype) {
    case "stock": await seedStockCentricTenant(tenant); break;
    case "transaction": await seedTransactionCentricTenant(tenant); break;
    case "job": await seedJobCentricTenant(tenant); break;
    case "appointment": await seedAppointmentCentricTenant(tenant); break;
  }
}
```

---

## 8. Materialized Views / Aggregation (VAG roll-up)

Per AGENTS.md Section 17 — VAG's Group Overview should not run live
aggregation across all tenants on every request.

```sql
CREATE MATERIALIZED VIEW tenant_daily_summary AS
SELECT
  tenant_id,
  date_trunc('day', date) AS day,
  SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN type = 'cost' THEN amount ELSE 0 END) AS cost,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
FROM ledger_entries
WHERE deleted_at IS NULL
GROUP BY tenant_id, date_trunc('day', date);
```

- Refresh via scheduled job (Railway cron / NestJS `@Cron`):
  `REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_daily_summary;` every 5-15
  minutes.
- VAG's `/admin/overview` endpoint queries this view, not raw
  `ledger_entries`, for the 8-entity roll-up.
- Item-level KPIs (Total SKU, stock value) for Warehouse-type tenants can use
  a similar `tenant_item_summary` view if `items` table grows large.

---

## 9. Build Sequence (aligned with FRONTEND.md)

1. **Bootstrap**: NestJS app, Prisma schema (Phase 1 models above), Railway
   Postgres provisioned, RLS policies applied, migrations run.
2. **Auth module**: login, JWT strategy, guards (Tenant + Roles), refresh
   tokens, invite flow. Seed one `super_admin` user + one Warehouse `admin`
   user manually for testing.
3. **Prisma extension + soft-delete middleware**: wire up before building any
   other module, so every subsequent module gets scoping/soft-delete for
   free.
4. **Tenants module**: `GET/PATCH /tenants/:id/config` — seed Warehouse's
   `tenantConfig` matching the frontend's hardcoded values from FRONTEND.md
   Step 1-7, so Step 8 (config extraction) on the frontend has real data to
   point at.
5. **Items module**: full CRUD + `kpi-summary` endpoint — this is what
   Warehouse Overview, Inventory, and Item Detail consume.
6. **Stock Movements module** (Inbound/Outbound/Transfers) — decide
   `StockMovement` vs `Job`-based model here.
7. **Suppliers module**.
8. **Ledger module**: CRUD + summary + P&L endpoints for Finance page.
9. **Notifications module**.
10. **Seed script**: `seedStockCentricTenant` populated with realistic
    Warehouse data — run against Railway staging so frontend can do its MSW
    → real cutover (FRONTEND.md Section 5) against real data.
11. **Materialized view + cron refresh** for `tenant_daily_summary` (can be
    deferred until VAG/Phase 2, but cheap to set up alongside Ledger module).

---

## 10. Phase 2+ Notes (backend-specific)

- **Kids Wear**: add `ItemVariant` model (itemId, size, color, season,
  quantity) — `Item` becomes a "parent product," variants hold
  per-combination stock.
- **Spare Shop / Cafe**: add `Order`/`Sale` model + `OrderItem`/`SaleItem`
  line items; Cafe's `Order` includes `OrderModifier` records. Spare Shop
  catalog endpoint = `GET /items?tenantId=<warehouse>&availableForRetail=true`
  (cross-tenant read, requires the `super_admin`-style unscoped query path or
  an explicit cross-tenant allowance — define this exception in the Prisma
  extension).
- **Mech Shop / Mechanics**: `Job` model already supports `hasQuote`,
  `JobMaterial`, `JobLabour` — add job status transition validation
  (state machine) in `jobs.service.ts`. Add `Vehicle` model for Mechanics
  (plate/VIN, make/model, owner, linked to `Job[]` for history feed).
- **Saloon**: `Appointment` model (tenantId, customerId, stylistId,
  serviceIds, startTime, endTime, status), `StylistSchedule` model for
  availability.
- **Requisitions** (deferred, Section 15): `StockRequest` model
  (requestingTenantId, fulfillingTenantId, itemId, quantityRequested,
  quantityFulfilled, status, linkedJobId) — the cross-tenant exception in the
  Prisma extension (used for Spare Shop catalog reads) generalizes to this
  too.
