# FRONTEND.md — Implementation Plan

Companion to `AGENTS.md`. This document is the frontend-specific
implementation plan: folder structure, build sequence, component contracts,
and the mock-to-real data strategy. Written for Next.js (App Router) +
Zustand + React Query + MSW.

---

## 1. Project Structure

```
/app
  /(auth)
    /login
    /reset-password
    /invite/[token]
  /(dashboard)
    /[tenant]
      /overview
      /[listSlug]                  -> generic List page (Inventory, Jobs, etc.)
      /[listSlug]/[id]              -> generic Detail page
      /finance
      /reports
      /users
      /settings
    /admin                          -> VAG-only routes
      /overview                    -> roll-up dashboard
      /[tenant]/...                  -> entity switcher target (reuses /[tenant] routes)

/components
  /primitives                       -> design tokens (colors, type, spacing) as CSS vars / Tailwind config
  /atoms
    Button.tsx
    StatusPill.tsx
    Avatar.tsx
    Input.tsx
    Select.tsx
    SearchBar.tsx
    IconButton.tsx
    StatValue.tsx
    EmptyState.tsx
  /molecules
    KpiCard.tsx
    NavItem.tsx
    TableRow.tsx
    ChartLegendItem.tsx
    ActivityFeedItem.tsx
    EntitySwitcherItem.tsx
  /organisms
    Sidebar.tsx
    TopBar.tsx
    KpiRow.tsx
    ChartPanel.tsx
    ActivityFeedPanel.tsx
    DataTable.tsx                   -> table | kanban | calendar modes
    DetailPanelSection.tsx          -> registry-driven
    StatusStepper.tsx                -> adaptive
  /templates
    DashboardTemplate.tsx
    ListDetailTemplate.tsx
    FormTemplate.tsx

/lib
  /api                               -> data access layer (see Section 5)
    items.ts
    jobs.ts
    ledger.ts
    users.ts
    tenants.ts
    notifications.ts
  /registries
    sectionTypes.ts                 -> Detail Template section registry
    displayModes.ts                  -> Data Table mode registry
    statusVocabularies.ts            -> Status Pill vocabulary configs
  /utils
    formatCurrency.ts
    formatNumber.ts
    permissions.ts                   -> requiredRole helper

/stores
  authStore.ts
  tenantStore.ts
  uiStore.ts

/types
  item.ts
  job.ts
  ledger.ts
  tenantConfig.ts
  user.ts
  notification.ts
  vehicle.ts
  appointment.ts
  index.ts                          -> re-exports

/mocks
  handlers/                         -> MSW request handlers, one per /lib/api domain
  data/                              -> fake records matching /types
  browser.ts                         -> MSW setup for dev

/styles
  globals.css
  tokens.css
```

---

## 2. Build Sequence (maps to AGENTS.md Section 16, Phase 1)

### Step 1 — Types + Mocks + MSW skeleton
- Write `/types` for `Item`, `KpiSummary`, `TenantConfig`, `User`,
  `Notification` first (minimum needed for Warehouse Overview).
- Write `/mocks/data` with realistic Warehouse fake data matching these
  types.
- Set up MSW handlers for `getItems`, `getKpiSummary`, `getTenantConfig`.
- This unblocks all UI work without waiting on backend.

### Step 2 — Auth
- `authStore` (Zustand): `{ userId, tenantId, role, token, isAuthenticated }`.
  Hydrate from JWT (decode on load, store in memory + httpOnly cookie for
  refresh token).
- `/login` page — calls `lib/api/auth.ts` (mocked initially).
- Route guard: redirect unauthenticated users to `/login`; redirect based on
  `role` (super_admin → `/admin/overview`, others → `/[tenant]/overview`).

### Step 3 — Primitives & Atoms
- Define color/spacing/typography tokens as CSS variables (or Tailwind
  theme extension) — pull from existing Warehouse design (Home.png).
- Build `StatusPill` against `statusVocabularies.ts` registry — even with
  only `stockStatus` populated initially.
- Build `EmptyState`, `Button`, `Avatar`, `Input`, `SearchBar`, `IconButton`,
  `StatValue`.

### Step 4 — Molecules
- `KpiCard` (icon + label + StatValue + delta)
- `NavItem` (icon + label + active state, collapsible)
- `TableRow`, `ChartLegendItem`, `ActivityFeedItem`

### Step 5 — Organisms
- `Sidebar` — accepts `navItems` prop (hardcode Warehouse's items for now,
  but prop-driven from day one)
- `TopBar` — user info, search, notifications bell, primary action slot,
  entity switcher slot (conditionally rendered on `role === 'super_admin'`)
- `KpiRow` — renders array of `KpiCard` from `kpiCards` config
- `ChartPanel` — wraps Recharts; accepts `type` ("bar"|"line"|"pie") and
  `series` array — build against Stock Level Trend + Inbound/Outbound shapes
  first
- `ActivityFeedPanel`
- `DataTable` — build `table` mode fully; stub `kanban`/`calendar` as
  unimplemented branches (so the prop contract exists from day one per
  AGENTS.md Section 5.2)
- `DetailPanelSection` — build against a `sectionTypes` registry; register
  Warehouse's section types first (`stockInfo`, `pricing`, `movementHistory`,
  `supplierInfo`)
- `StatusStepper` — build adaptive logic now even though Warehouse doesn't
  use it (Mech Shop will); test with mock job data

### Step 6 — Templates
- `DashboardTemplate` — assembles TopBar + KpiRow + ChartPanel(s) +
  ActivityFeedPanel/DataTable
- `ListDetailTemplate` — List side renders `DataTable`; Detail side renders
  header + optional `StatusStepper` + `DetailPanelSection[]`, with `mode`
  prop (`view`/`edit`/`create`)
- `FormTemplate` — for Users/Settings

### Step 7 — Warehouse Pages (in order, per AGENTS.md Phase 1)
1. Overview (`DashboardTemplate` + Warehouse config) — should visually match
   Home.png
2. Inventory (List) + Item Detail (Detail) — first `ListDetailTemplate`
   instance
3. Inbound, Outbound, Transfers — reuse `ListDetailTemplate`,
   `movementStatus` vocabulary (second vocabulary — validates `StatusPill`
   generality)
4. Suppliers — reuse `ListDetailTemplate`
5. Reports — `ChartPanel`-heavy page + export action
6. Finance — ledger tab (`DataTable`) + P&L tab (`ChartPanel`), per
   AGENTS.md Section 13
7. Users, Settings — `FormTemplate`

### Step 8 — Config Extraction
- Once Warehouse is fully built with hardcoded values, extract everything
  entity-specific into a `tenantConfig` object (see `/types/tenantConfig.ts`).
- Validate with Zod on fetch (`tenantConfig.schema.ts`).
- Wire `Sidebar`, `KpiRow`, `DashboardTemplate`, `ListDetailTemplate` to read
  from `tenantStore.tenantConfig` instead of hardcoded props.
- Build the **tenant config playground** route (`/dev/config-playground` or
  similar, dev-only) — paste/edit a `tenantConfig` JSON, preview against any
  template live.

---

## 3. Component Contracts (key props)

### DataTable
```ts
type DataTableProps<T> = {
  data: T[];
  columns: ColumnConfig<T>[];
  filters?: FilterConfig[];
  displayMode: "table" | "kanban" | "calendar";
  groupByField?: keyof T;          // required for kanban/calendar
  selectable?: boolean;
  pagination?: { cursor: string | null; pageSize: number };
  onRowClick?: (row: T) => void;
  emptyState?: { message: string; ctaLabel?: string; onCta?: () => void };
};
```

### DetailTemplate
```ts
type DetailTemplateProps = {
  header: HeaderConfig;
  stepper?: StepperConfig | null;   // null for non-job archetypes
  sections: SectionInstance[];       // each references a registered sectionType
  mode: "view" | "edit" | "create";
  primaryAction?: ActionConfig;       // status-advance button, context-aware label
};
```

### StatusPill
```ts
type StatusPillProps = {
  status: string;
  vocabulary: keyof typeof statusVocabularies;
};
```

### tenantConfig (Zod-validated)
```ts
const TenantConfigSchema = z.object({
  tenantId: z.string().nullable(),
  archetype: z.enum(["stock", "transaction", "job", "appointment"]).nullable(),
  navItems: z.array(z.object({
    label: z.string(),
    icon: z.string(),
    route: z.string(),
    pageType: z.enum(["dashboard", "list", "detail", "form"]),
  })),
  kpiCards: z.array(z.object({
    label: z.string(),
    icon: z.string(),
    metricKey: z.string(),
    color: z.string(),
  })),
  terminology: z.record(z.string()),
  enabledModules: z.array(z.string()),
});
```

---

## 4. Status Pill Vocabularies (initial registry contents)

```ts
// lib/registries/statusVocabularies.ts
export const statusVocabularies = {
  stockStatus: {
    "In Stock": "success",
    "Low Stock": "warning",
    "Out of Stock": "error",
  },
  movementStatus: {
    Pending: "neutral",
    Approved: "info",
    Received: "success",
    Shipped: "info",
    Delivered: "success",
  },
  jobStatus: {
    Received: "neutral",
    Quoted: "neutral",
    Approved: "info",
    "In Progress": "info",
    QC: "warning",
    Delivered: "success",
  },
  orderStatus: {
    New: "neutral",
    Preparing: "info",
    Ready: "warning",
    Served: "success",
  },
  appointmentStatus: {
    Booked: "neutral",
    Confirmed: "info",
    "In Progress": "info",
    Completed: "success",
    "No-show": "error",
    Cancelled: "error",
  },
  saleReturnStatus: {
    Completed: "success",
    Refunded: "warning",
    Restocked: "info",
    "Written Off": "error",
  },
} as const;
```

Build Warehouse pages against `stockStatus` + `movementStatus` only in
Phase 1 — remaining vocabularies are added as registry entries when their
respective entities are built (no component changes required).

---

## 5. Data Access Layer & Mock Strategy

Every component calls functions from `/lib/api/*`, never mock or real data
directly.

```ts
// lib/api/items.ts
import { Item } from "@/types/item";

export async function getItems(tenantId: string, filters?: ItemFilters): Promise<Item[]> {
  const res = await fetch(`/api/items?tenantId=${tenantId}&...`);
  return res.json();
}

export async function getItem(id: string): Promise<Item> {
  const res = await fetch(`/api/items/${id}`);
  return res.json();
}
```

### MSW setup
- `/mocks/handlers/items.ts` intercepts `GET /api/items` and `GET
  /api/items/:id`, returns data from `/mocks/data/items.ts` (typed as
  `Item[]`).
- `/mocks/browser.ts` registers all handlers, started conditionally in
  `app/layout.tsx` based on `process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'`.
- React Query wraps every `lib/api` call:
  ```ts
  const { data, isLoading, error } = useQuery({
    queryKey: ["items", tenantId, filters],
    queryFn: () => getItems(tenantId, filters),
  });
  ```
  `DataTable` and `KpiRow` consume `isLoading`/`error` to render skeleton/
  error states automatically (per AGENTS.md Section 9).

### Cutover to real backend
1. Confirm NestJS endpoint paths/response shapes match `/lib/api` function
   signatures and `/types`.
2. Set `NEXT_PUBLIC_API_MOCKING=disabled`, point `fetch` base URL at the
   Railway-hosted NestJS API.
3. No component, store, or template changes required.

---

## 6. Permissions Pattern

```ts
// lib/utils/permissions.ts
export function hasPermission(role: Role, capability: Capability): boolean {
  return permissionMatrix[role].includes(capability);
}
```

Used in components:
```tsx
{hasPermission(role, "createRecord") && (
  <Button onClick={openCreateModal}>New Item</Button>
)}
```

`permissionMatrix` is generated from AGENTS.md Section 12's role table —
keep this as a single exported object, not scattered conditionals.

---

## 7. Phase 2+ Notes (per archetype, frontend-specific)

- **Kids Wear**: add `variantMatrix` section type to `sectionTypes.ts`
  registry; add `Collections` as a filter config on Inventory's List page
  (no new page).
- **Spare Shop / Cafe**: add `saleReturnStatus`/`orderStatus` vocabularies;
  implement `kanban` mode in `DataTable` for Cafe's Kitchen Display; add
  `modifierEditor` section type for Cafe menu items.
- **Mech Shop / Mechanics**: implement `StatusStepper` fully against real job
  data; add `historyFeed` section type for Vehicle Registry; add
  `materialsUsed`/`labourLog`/`costSummary`/`qcChecklist` section types.
- **Saloon**: implement `calendar` mode in `DataTable`; add
  `appointmentStatus` vocabulary; `historyFeed` + preferences/loyalty
  sections for Customer Profile.
- **VAG**: build `/admin/overview` roll-up dashboard (8 entity rows using
  `KpiRow` in a condensed variant), `EntitySwitcher` molecule in `TopBar`,
  "Viewing as Admin" banner component.
