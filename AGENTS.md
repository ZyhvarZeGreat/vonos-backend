# AGENTS.md — Vonos Group Multi-Tenant Operations Platform

Source of truth for any agent (human or AI) implementing this project.
Covers architecture, multi-tenancy model, design system, frontend/backend
sync strategy, engineering practices, per-entity page sets, and build order.

---

## 1. Project Context

Vonos Group operates **8 business entities** (7 operating tenants + VAG admin).
Four legacy WordPress/cPanel sites were migrated; two former automotive installs
(VM Mechanics + VMS Mech Shop) are **merged into Vonos Automotive (`VA`)**.
The former single **VSS** (Spare Shop) label is split into **VISP** (institute)
and **VSP** (marketplace) — separate Ultimate POS installs and tenants.

| Code | Entity                      | Status                   |
|------|-----------------------------|--------------------------|
| VA   | Vonos Automotive            | Existing (WP, merged VM+VMS) |
| VW   | Vonos Warehouse             | Existing (Ultimate POS — canonical: `audit.vonosautos.com` / `vonomglk_audit`, `Vonos warehouse.sql`; legacy `vonomglk_hq2` archive only) |
| VISP | Vonos Institute Spare Parts | Existing (Ultimate POS, migrate) |
| VSP  | Vonos SP Marketplace        | Existing (Ultimate POS, migrate) |
| VC   | Vonos Cafe                  | New build (no migration) |
| VS   | Vonos Saloon                | New build (no migration) |
| VKW  | Vonos Kids Wear             | New build (no migration) |
| VAG  | Vonos Autos Group           | Central admin (aggregation layer, no own data) |

Retired codes: **VM** (Mechanics), **VMS** (Mech Shop), **VSS** (mislabel — data
under `VISP`); `/VSS/*` routes redirect to `/VISP/*`.

Goal: replace disconnected WordPress sites + manual admin oversight with
**one multi-tenant platform** — one codebase, one database, config-driven per
tenant, with VAG as a super-admin aggregation layer.

---

## 2. Tech Stack

- **Frontend:** Next.js (App Router), Zustand for state management
- **Backend:** NestJS
- **Database:** PostgreSQL + Prisma ORM
- **Hosting:** Railway Pro
- **Auth:** JWT — payload shape `{ userId, tenantId, role }`
- **Data fetching:** React Query (TanStack Query) for all API calls
  (caching, loading/error states, pagination)
- **Validation:** Zod — used to validate `tenantConfig` at runtime
- **Dev/mocking:** MSW (Mock Service Worker) to intercept network calls
  during frontend-first development

### Zustand Stores
- `authStore` — userId, tenantId, role, token
- `tenantStore` — activeTenantId, tenantConfig (nav items, KPI config,
  labels/terminology, enabled modules)
- `uiStore` — sidebarCollapsed, activeNav, notifications

---

## 3. Multi-Tenancy Model

- **One shared PostgreSQL database.** Every tenant-scoped table has a
  `tenant_id` column.
- **VAG (super admin) = `tenantId: null`** in the JWT. Backend middleware
  treats `null` as unscoped — VAG queries run across all tenants.
- All other roles have a concrete `tenantId`; every query is automatically
  filtered by it.
- **No webhooks / no separate services.** "Sync" between entities (e.g.
  Warehouse stock ↔ retail catalog tenants) is cross-tenant queries and DB
  transactions within the same database — not network calls.

### Hardening (added)

- **Prisma Client Extensions (`$extends`)**: auto-inject `where: { tenantId }`
  into queries for non-admin roles. Removes the risk of a missed manual
  scoping clause — the single worst bug class for this system (cross-tenant
  data leak).
- **Postgres Row-Level Security (RLS)** as a database-level backup: policies
  like `USING (tenant_id = current_setting('app.tenant_id'))`. Set
  `app.tenant_id` per request/transaction. Even if application code forgets
  to scope, the DB enforces it.
- **Global soft-delete middleware**: intercept all `delete` calls, convert to
  `update({ deletedAt: new Date() })`; auto-filter `deletedAt: null` on all
  reads. Applies to items, jobs, customers, vehicles, etc. — required for
  audit trail integrity (nothing is hard-deleted).
- **Defensive migrations**: any `NOT NULL` column addition needs a default or
  backfill step — multi-tenant data makes bad migrations costlier.

---

## 4. The 4 App Archetypes

Every entity maps to one of 4 archetypes, defined by its **core atom**.

| Archetype           | Entities                          | Core Atom                       |
|---------------------|-------------------------------------|----------------------------------|
| Stock-centric        | Warehouse (VW), Kids Wear (VKW)     | Item / quantity-on-hand          |
| Transaction-centric    | VISP, VSP, Cafe (VC)                | Sale / Order                     |
| Job-centric            | Vonos Automotive (VA)               | Job (adaptive status stepper)    |
| Appointment-centric    | Saloon (VS)                         | Scheduled booking                |

VAG has no archetype — it is the unscoped aggregation view over all tenants.

### Archetype notes

- **Stock-centric:** Item (SKU, quantity, cost). Kids Wear adds a variant
  matrix (size × color × season) on the same item model.
- **Transaction-centric:** Sale/order referencing items. Cafe adds modifiers
  + kitchen routing.
- **Job-centric:** Job with multi-stage status, materials, labour, cost
  roll-up. Mechanics ties jobs to a persistent Vehicle record (secondary
  atom with its own history).
- **Appointment-centric:** Scheduled booking (time slot + customer + staff +
  service).

---

## 5. Page Templates — 3 Total

The system reduces to **3 templates**, made generic enough via
modes/registries that Profile and Calendar "views" are not separate
templates.

### 5.1 Dashboard Template
- Top Bar + KPI Row (config-driven cards) + Chart Panels (config-driven
  series) + Feed/Table panels.
- Reference implementation: Warehouse Overview (Home.png).

### 5.2 List/Detail Template (unified via modes + registries)

**List side — Data Table organism**, generic via:
```ts
<DataTable
  data={...}
  columns={...}            // config-driven
  filters={...}             // config-driven filter bar
  displayMode="table" | "kanban" | "calendar"
  groupByField={...}        // used by kanban/calendar modes
  selectable={boolean}      // optional bulk actions (checkbox column)
/>
```
- `table` mode — Warehouse Inventory, Inbound, Outbound, Transfers,
  Suppliers, etc.
- `kanban` mode — Cafe Kitchen Display (grouped by order status)
- `calendar` mode — Saloon Booking Calendar (grouped by time slot/stylist)

**Detail side — Detail Template**, generic via:
```ts
<DetailTemplate
  header={...}
  stepper={...}              // null for non-job archetypes
  sections={[...]}            // array of registered section types
  mode="view" | "edit" | "create"
/>
```
- "Create new X" = Detail Template in `mode="create"` — no separate create
  UI.
- **Profile pages** (Vehicle Registry, Customer Profile) = Detail Template +
  a `historyFeed` section type (chronological list of linked
  jobs/appointments). Not a separate template.
- Section types are registered in `registries.ts` (see Section 9) — adding a
  new section type (e.g. Cafe's modifier editor, Kids Wear's variant matrix)
  means adding to the registry, not changing the template contract.

### 5.3 Form/Settings Template
- Users, Settings — near-identical structure across all tenants.

---

## 6. Status Pill & Status Stepper

These are **separate components** with separate purposes:

### Status Pill (atom)
- `<StatusPill status="In Progress" vocabulary="jobStatus" />` — looks up a
  color (success/warning/error/info/neutral) from a vocabulary config. Used
  in lists, kanban cards, anywhere a status needs a colored label without a
  progress visualization.
- Vocabularies identified:
  - `stockStatus`: In Stock / Low Stock / Out of Stock
  - `movementStatus`: Pending / Received / Shipped / Delivered / Approved
  - `jobStatus`: Received / Quoted / Approved / In Progress / QC / Delivered
  - `orderStatus`: New / Preparing / Ready / Served
  - `appointmentStatus`: Booked / Confirmed / In Progress / Completed /
    No-show / Cancelled
  - `saleReturnStatus`: Completed / Refunded / Restocked / Written Off
- New vocabulary = new config entry, zero component changes.

### Status Stepper (organism, Job-centric Detail Template only)
- **Adaptive**: renders only the stages applicable to the specific record —
  never shows a greyed-out "skipped" step.
- Mech Shop (VMS) reference stages: `Received → Quoted (conditional) →
  Approved → In Progress → QC → Delivered`. If a job has no quote, the
  stepper renders 5 steps, not 6.
- Mechanics (VM) follows the same adaptive principle with its own stage set.
- Stepper width is flexible — 5-step and 6-step jobs render at different
  widths; consistency across a job list was explicitly deprioritized in
  favor of per-job accuracy.
- The Detail page's primary action button is context-aware: it always
  advances to the *next applicable* stage (e.g. "Mark Approved," "Start
  Work," "Send to QC," "Mark Delivered") — label computed from current stage
  + applicable stage list, not a generic "Next" button.
- Reusable wherever a multi-stage lifecycle exists (future: requisition
  status).
- Does NOT cover: transition validation/state machine logic (backend), or
  cost calculations (separate sections).

---

## 7. VAG (Admin) Structure

VAG is **not a separate app** — same shell, same 3 templates, with two
additions:

1. **Group Overview = roll-up Dashboard**
   - 8 condensed entity rows (2-3 key metrics each + "Enter" action) + group
     aggregate charts. Same Dashboard Template, different top-section config,
     unscoped (`tenantId: null`) data.

2. **Entity Switcher + "Viewing as Admin" mode**
   - Top-bar dropdown (super_admin only) to enter any of the 8 entities.
   - On entry: renders that entity's exact UI (same templates/config a
     regular manager sees) with a persistent "Viewing: [Entity] (as Admin)"
     banner and "Back to Group Overview" action.

VAG's Reports/Finance/Users pages = same templates, run unscoped and grouped
by entity.

---

## 8. Design System — Build Order

1. **Primitives** (tokens): color (incl. semantic success/warning/error/
   info/neutral), typography scale, spacing, radius/shadow, icon set.

2. **Atoms**: Button, **Status Pill** (build early — highest reuse), Avatar,
   Input/Select/Search, Icon button, Stat value + delta, **EmptyState**.

3. **Molecules**: KPI Card, Nav Item, Table Row, Chart Legend Item, Activity
   Feed Item, Entity Switcher Item.

4. **Organisms**: Sidebar (config-driven nav), Top Bar (incl. entity
   switcher), KPI Row, Chart Panel (arbitrary series, `type:
   "bar"|"line"|"pie"`), Activity Feed Panel, **Data Table** (table/kanban/
   calendar modes, filters, pagination, selectable), **Detail Panel
   Section** (registry-driven), **Status Stepper** (adaptive).

5. **Templates**: Dashboard, List/Detail (unified), Form/Settings.

6. **Pages**: Template + per-entity `tenantConfig` = actual screens.

---

## 9. Generic-by-Default Checklist

These were identified as cheap-now / expensive-later — build into organisms
from the start:

- **Config-driven filters**: List Template filter bar renders from a
  `filters` config array (key, type, vocabulary/options) — same pattern as
  `columns`.
- **EmptyState**: generic molecule (icon + message + optional CTA), rendered
  automatically by Data Table / Chart Panel when data is empty.
- **Loading & error states**: skeleton loaders and "Something went wrong,
  retry" built into Data Table / KPI Card / Chart Panel organisms — not added
  per-page.
- **Pagination**: cursor-based (`WHERE id > lastId LIMIT n`), not
  offset-based, from day one — Data Table assumes growth (transactions, job
  logs, activity feed).
- **Bulk actions**: Data Table supports an optional `selectable` prop
  (checkbox column) even if unused initially.
- **Create flow**: Detail Template `mode="create"` — no separate create UI.
- **Permissions in components**: actions (Edit/Approve/Delete/Invite) accept
  a `requiredRole` check against `authStore`, not just route-level guards.
- **Notification shape** (generic across entity types):
  ```ts
  { type, title, message, linkedRecord, severity, read, createdAt }
  ```
  Top Bar notification panel renders this shape generically; `type` drives
  icon selection.
- **Search (⌘K) result shape**: generic across entity types so a single
  query can return mixed results (vehicles + jobs + customers for
  Mechanics, etc.).
- **Currency/number formatting**: centralized `formatCurrency()` /
  `formatNumber()` utilities, respecting a `currency` field on monetary
  values (multi-currency-ready even if everything is NGN today).
- **Registries** (`registries.ts`): single file documenting Detail Template
  section types, Data Table display modes, and Status Pill vocabularies. New
  entity work = "what's missing from the registry?"

---

## 10. Frontend/Backend Sync Strategy (build without blocking on schema)

1. **Shared `/types` contract first** — TS interfaces for core shapes
   (`Item`, `Job`, `LedgerEntry`, `TenantConfig`, `User`, `Notification`,
   `Vehicle`, `Appointment`, etc.), based on everything in this doc. Single
   source of truth for both frontend and backend.

2. **Data access layer** (`lib/api/*.ts`), organized by domain, mirroring
   future NestJS modules:
   ```
   lib/api/
     items.ts          (getItems, getItem, createItem, updateItem)
     jobs.ts           (getJobs, getJob, advanceJobStatus, ...)
     ledger.ts         (getLedgerEntries, getKpiSummary, ...)
     users.ts
     tenants.ts        (getTenantConfig)
     notifications.ts
   ```
   Components call these functions only — never import mock or real data
   directly.

3. **MSW (Mock Service Worker)** intercepts `fetch`/`axios` calls at the
   network level in dev, returning mock data matching `/types`. Data access
   layer is written as if hitting real endpoints from day one
   (`fetch('/api/items')`).

4. **Swap to real backend** = turn MSW off, point at NestJS base URL. Zero
   component changes, zero data-layer changes — assuming field
   names/shapes match.

5. **Prisma schema mirrors `/types`** — same field names, same enums (e.g.
   `status` as Prisma enum matching the TS union type). This is what makes
   the real API a drop-in replacement for mocks.

---

## 11. Per-Entity Page Sets

| Page slot | Warehouse (VW) | Kids Wear (VKW) | VISP | VSP | Cafe (VC) | Automotive (VA) | Saloon (VS) |
|---|---|---|---|---|---|---|---|
| **Overview** | KPI: SKU/Inbound/Outbound/Value | KPI: SKU/Sales/Returns/Value | KPI: Sales/Returns/LowStock/Revenue | KPI: Orders/LowStock/Revenue | KPI: Orders/Tables/LowStock/Revenue | KPI: OpenJobs/InShop/PendingQC/PartsPending/Revenue | KPI: Today'sAppts/Available/NoShows/Revenue |
| **Primary List** | Inventory (items) | Inventory (variant matrix) | Sales/Transactions | Sales/Orders | Orders | Jobs (+ Vehicle link) | Appointments (calendar mode) |
| **Primary Detail** | Item Detail | Item Detail (matrix section) | Sale Detail | Sale Detail | Order Detail (modifier section) | Job Detail (stepper) | Appointment Detail |
| **Secondary List 1** | Inbound | Inbound | Returns/Warranty | Returns/Warranty | Kitchen Display (kanban mode) | Vehicle Registry (historyFeed) | Customer Profile (historyFeed) |
| **Secondary List 2** | Outbound | Outbound | Customers | Customers | Table Management | Requisitions | Stylist Schedule |
| **Secondary List 3** | Transfers | Collections (tag filter) | — | — | Daily Closeout | — | — |
| **Contacts** | Suppliers | Suppliers | Customers | Customers | Suppliers | Customers | Vehicle Registry | Customer Profile |
| **Reports** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Finance** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Users** | ✓ (identical everywhere) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Settings** | ✓ (identical everywhere) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 12. Onboarding & Auth

- **Invite-based, not self-signup** (internal operations tool).
- `users` table: `id, email, password_hash, tenant_id (null for
  super_admin), role, name, status (invited|active|suspended),
  created_at, last_login_at`.
- **Roles**: `super_admin` (VAG, `tenantId: null`), `admin`, `manager`,
  `staff`, `viewer` — all scoped to one `tenantId` except super_admin.
- **Flow**: VAG creates each entity's first Admin (invite-email flow, same
  as everyone else). Entity Admins invite Manager/Staff/Viewer within their
  own tenant only.
- **Login**: email + password → JWT `{userId, tenantId, role}`. Super admins
  land on Group Overview (no single tenant).
- **New tenant setup checklist** (VAG "Add Entity" flow): entity name +
  branding (logo/accent color), archetype confirmation, initial Admin invite,
  terminology overrides, KPI card confirmation.

### Role Permission Matrix

| Capability | Viewer | Staff | Manager | Admin | Super Admin (VAG) |
|---|---|---|---|---|---|
| View dashboard/reports | ✓ | ✓ | ✓ | ✓ | ✓ (all tenants) |
| Create/edit records | ✗ | ✓ | ✓ | ✓ | ✓ |
| Approve/reject (requisitions, QC) | ✗ | ✗ | ✓ | ✓ | ✓ |
| Invite/manage users (own tenant) | ✗ | ✗ | ✗ | ✓ | ✓ |
| Edit tenant settings/config | ✗ | ✗ | ✗ | ✓ | ✓ |
| Access other tenants | ✗ | ✗ | ✗ | ✗ | ✓ |
| Entity switcher | ✗ | ✗ | ✗ | ✗ | ✓ |

### Security
- Forgot-password: token-based reset email.
- **2FA (TOTP)** for Admin and Super Admin roles.
- JWT: access token (~2h) + refresh token (~7 days, httpOnly
  cookie). Role/tenant changes apply on next token refresh (acceptable at
  this scale; `tokenVersion` field optional for immediate revocation).
- Deactivation, not deletion, for departing staff (`status: suspended`) —
  preserves audit trail.

### Open question
- Multi-entity staff (someone working across e.g. VISP and Warehouse)
  — current model assumes one `tenantId` per user. Not yet resolved.

---

## 13. Finance/Accounting Module

- **Per-tenant "Finance" page** — own sidebar item (terminology-overridable,
  e.g. "Sales & Expenses" for Cafe).
- **Layout** (Dashboard Template variant):
  - KPI Row: Revenue, Expenses/Costs, Net, Outstanding/Pending
  - Tab A — **Transaction Ledger** (List Template): chronological
    `ledger_entry` rows (date, type, description, linked record, category,
    amount, color-coded by type). Linked record is clickable → deep-links to
    the source Job/Sale/Item Detail page (ledger entries are pointers, not
    standalone detail pages).
  - Tab B — **P&L Summary** (Chart Panel): revenue vs cost over time,
    category breakdown, period comparison.
- **Shared atom**: `ledger_entry { tenantId, type: revenue|cost|expense,
  amount, category, linked_record, date, currency }`.
- **Manual entries**: "Add Expense" action for entries with no linked record
  (rent, utilities, supplier payments) — amount, category, date,
  description, optional attachment.
- **Permissions**: Viewer/Staff = read-only; Manager = view + add manual
  expense; Admin = full + export; VAG = per-tenant view via entity switcher +
  consolidated cross-entity view.
- **Export**: Excel/PDF of filtered view.
- **VAG consolidated view**: same templates, unscoped + grouped by entity.
  Internal transfer elimination (Warehouse fulfilling a requisition for
  Mechanics shouldn't double-count as group revenue) — **logic deferred, not
  yet designed**.

---

## 14. Niche / Entity-Specific Additions (as registry entries, not new templates)

- **Mechanics (VM)**: Vehicle Registry = Detail Template + `historyFeed`
  section (past jobs for that vehicle) + warranty status section + service
  reminders/alerts.
- **Mech Shop (VMS)**: "Generate Quote PDF" export action on Job Detail (when
  quoting applies).
- **VISP / VSP** (retail catalog tenants): Returns & Warranty Claims = List/Detail with a
  `saleReturnStatus` vocabulary and a Restock-vs-Write-Off action (affects
  Warehouse stock count). Optional Pricing Rules settings page (markup % per
  category). VISP = high-volume institute POS; VSP = smaller marketplace catalog.
- **Cafe (VC)**:
  - Menu Item Detail needs a **modifier editor** section type (nested
    modifier groups, each with options + price deltas).
  - **Kitchen Display** = Data Table `displayMode="kanban"`, grouped by
    `orderStatus`.
  - **Table Management** = grid of table-status cards (Available/Occupied/
    Reserved) — not a literal floor-plan graphic, stays within component
    system.
  - **Daily Closeout** = Reports sub-page or snapshot-generating action
    (cash reconciliation vs expected sales).
- **Saloon (VS)**:
  - **Booking Calendar** = Data Table `displayMode="calendar"` (time slots ×
    stylists).
  - Stylist Availability/Schedule = Form/Settings page (affects bookable
    slots).
  - Customer Profile = Detail Template + `historyFeed` (appointment history)
    + preferences section + loyalty points section.
- **Kids Wear (VKW)**:
  - Item Detail needs a **variant matrix** section type (size × color stock
    grid).
  - Seasonal Collections = tag-based filter on Item List, not a new page.
  - Size Recommendation calculator — likely out of scope for this admin
    platform (customer-facing storefront concern).

---

## 15. Deferred / Not Yet Designed

- **Cross-entity requisition flow** (Warehouse ↔ Mechanics/Mech Shop):
  shared request record, status Pending → Approved → Fulfilled/Rejected,
  linked to a job, affects job costing and Warehouse stock. Edge cases
  identified: stock changes between request/approval, competing requests,
  cancellation/reservation release, request aging, items not in Warehouse
  catalog (procurement request path), partial fulfillment, returns of unused
  materials.
- **Retail catalog sync** (VISP/VSP): live filtered query against Warehouse's
  `items` table (not webhook/copy) — items marked `available_for_retail`.
- **"Available stock" definition**: needs single consistent definition
  (on-hand minus reservations/pending requests) used everywhere displayed —
  currently undefined; risk of phantom oversells (retail tenants selling stock
  already reserved by an approved requisition).
- **Negative stock / oversell handling**: block sale vs allow + flag
  discrepancy for reconciliation — ties to "available stock" definition
  above.
- **VAG financial consolidation**: cross-entity transfer elimination logic
  not yet designed.
- **WordPress / Ultimate POS migration**: legacy sites (VM, VW, VMS, VISP, VSP)
  — export via phpMyAdmin/mysqldump → inspection → transform/import into Postgres.
  VISP/VSP cutover runbook: [VISP_VSP_CUTOVER_PLAN.md](docs/migration-audits/VISP_VSP_CUTOVER_PLAN.md).

---

## 16. Build/Implementation Order

### Phase 1 — Generic shell + Warehouse to completion
Goal: validate all 3 templates, Status Pill across multiple vocabularies, and
the config/registry approach using one fully-built entity.

1. Auth pages (login, reset, invite-acceptance) + `authStore`
2. App Shell — Sidebar + Top Bar (hardcoded Warehouse nav initially)
3. Status Pill atom (config-mapped vocabularies) + EmptyState
4. KPI Card molecule + KPI Row organism
5. Chart Panel organism (arbitrary series: bar/line/pie)
6. Data Table organism (table mode first; kanban/calendar modes stubbed via
   `displayMode` prop from the start)
7. Activity Feed Panel
8. Assemble Dashboard Template → **Warehouse Overview** (matches Home.png)
9. List/Detail Template → **Inventory** + **Item Detail**
10. **Inbound**, **Outbound**, **Transfers** (table mode, `movementStatus`
    vocabulary — stress-tests Status Pill with a second vocabulary)
11. **Suppliers** (List/Detail)
12. **Reports** (stock valuation, movement summary, low-stock — Chart Panel +
    export)
13. **Finance** (ledger + P&L tabs — reuses Chart Panel + Data Table)
14. **Users**, **Settings** (Form/Settings Template)
15. Extract `tenantConfig` from hardcoded Warehouse values → make
    Sidebar/KPI Row/Dashboard Template config-driven (Zustand `tenantStore`)

### Phase 2+ — Replicate per archetype
- Kids Wear (validate Stock-centric template + variant matrix section type)
- VISP, VSP, Cafe (Transaction-centric; introduces kanban mode for Cafe)
- Mech Shop, Mechanics (Job-centric; introduces Status Stepper, historyFeed
  for Vehicle Registry)
- Saloon (Appointment-centric; introduces calendar mode)
- VAG (roll-up dashboard, entity switcher, unscoped templates)
- Connective tissue (Section 15 deferred items)

---

## 17. Engineering Practices Summary

Highest-priority items for a 2-person team:

1. **Prisma `$extends` for auto-tenant-scoping** — prevents the most
   dangerous bug class (cross-tenant leak) with one piece of code.
2. **Tenant config playground page** (hidden admin route) — preview any
   `tenantConfig` against any template without real login/data; massively
   speeds up the config-driven workflow this entire system depends on.

Also: RLS as defense-in-depth, global soft-delete middleware, Zod-validated
configs, `enabledModules` feature flags, Storybook for the component library,
cursor-based pagination, materialized views/scheduled aggregation for
dashboard KPIs (especially VAG's roll-up), React Query everywhere, seed
scripts parameterized per archetype (not per tenant), and a central
`registries.ts`.

---

## 18. Open Questions

- ~~Cross-referral between Mechanics and Mech Shop~~ — **resolved**: merged into `VA` (single tenant).
- Does Mechanics ever hold its own small stock separate from Warehouse?
- Multi-entity staff access model (Section 12).
- Internal transfer elimination for VAG consolidated P&L (Section 13/15).
- Time zone scope — confirm all 8 entities are single-location/single-
  timezone (Lagos).
