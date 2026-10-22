# Cafe POS — Gap Closure Plan

Follows `CAFE_POS_IMPLEMENTATION_PLAN.md` (Phases 1–4 shipped). This doc covers
everything still missing before the cafe can trade on the till, ordered so each
batch leaves the till usable.

Evidence for each gap was gathered from the current tree (file references below).

---

## 1. Gap register

| # | Gap | Severity | Where |
|---|-----|----------|-------|
| 1 | "Add customer" `+` is a disabled placeholder | **blocking** | `components/pages/pos/PosCartPanel.tsx:94-100` |
| 2 | No table assignment on an order | **blocking** (cafe) | `lib/api/orders.ts:16` (`tableNumber: null`) |
| 3 | Kitchen Display shows POS sales as **Served** — no cooking lifecycle | **blocking** (cafe) | `lib/api/orders.ts:6-9` (`ORDER_STATUS_MAP`) |
| 4 | Register not enforced server-side | high | `modules/sales/sales.service.ts` (`create`) |
| 5 | Cart line: no unit / price / line-discount edit | high | `PosCartPanel.tsx` row |
| 6 | No keyboard shortcuts (`shift+e/c/d/p/i`, `F11`) | medium | till root |
| 7 | Category drawer has no sub-category paging (`Next »`) | low | `PosFilterDrawer.tsx` |
| 8 | Register history API unused — no shifts UI / printed report | medium | `lib/api/cashRegister.ts` (`getRegisterHistory`) |
| 9 | Shipping charges not persisted | low | `Sale` model / `CreateSaleRequest` |
| 10 | **Modifiers** — no types, schema, or UI anywhere | **blocking** (cafe) | `packages/types`, `schema.prisma` |
| 11 | Daily Closeout (cash reconciliation) missing | medium | — |
| 12 | Table Management not wired to the till | medium | `TableManagementView.tsx`, `cafe-tables` |
| 13 | `GET /cash-register/current` returns empty 200 body for "none" | low | `cash-register.controller.ts` |
| 14 | Card details stored only in payment note | low | `PosPaymentModal.tsx` |
| 15 | No "allow oversell" setting (hard block) | low | till add-to-cart |

---

## 2. Fix batches

### B1 — Till essentials (blocking, ~1 day) — ✅ DONE
> Add-customer, table assignment, and server-side register enforcement shipped
> (verified: no-register sale → 400; table/customer persist on the sale).
**Goal: a cashier can serve any walk-in, at a table, with server-side guardrails.**

1. **Add customer from the till**
   - `PosCustomerModal`: name (required), phone, email → `POST /customers`
     (`lib/api/customers.ts` already has create helpers — verify and reuse).
   - Enable the `+` button in `PosCartPanel`; on save select the new customer,
     invalidate `["pos-customers", tenantId]`.
2. **Table assignment**
   - Schema: `Sale.tableId String?`, `Sale.tableName String?` (+ optional
     `CafeTable.status` sync on sale create/finalize).
   - `CreateSaleRequest`: `tableId?`, `tableName?`; sales service persists and
     returns them; `saleToOrder()` uses the real value.
   - Till: table picker in the cart panel header (list from `cafe-tables`),
     shown only when `tenantConfig.code === "VC"`.
3. **Server-side register enforcement**
   - In `sales.service.create`: for tenants with the `pos` module, require an
     open `CashRegister` unless `status` is `draft`/`quotation`; 400 otherwise.
   - Optional tenant flag `requireOpenRegister` (default true for VC) to avoid
     breaking other tenants.

**Acceptance:** new customer created and selected at the till; a sale carries a
table; `POST /sales` with no open register → 400; with one → 201.

---

### B2 — Order lifecycle + Kitchen Display (blocking, ~1 day) — ✅ DONE
> `Sale.orderStatus` (new/preparing/ready/served), `PATCH /sales/:id/order-status`,
> POS creates orders as **new**, Kitchen Display kanban has an **Advance** button.
**Goal: a POS sale enters the kitchen as "New" and moves New → Preparing → Ready → Served.**

1. Schema: enum `CafeOrderStatus { new, preparing, ready, served }`,
   `Sale.orderStatus CafeOrderStatus @default(served)` (default preserves
   existing behaviour for non-cafe tenants).
2. POS creates sales with `orderStatus: "new"` (VC only).
3. `PATCH /sales/:id/order-status` (or reuse `workshop-status`) to advance.
4. `saleToOrder()` maps `orderStatus` instead of `ORDER_STATUS_MAP`.
5. Kitchen Display: kanban by status (AGENTS.md §14) with advance buttons;
   poll/refetch as it does today.
6. Kitchen ticket shows table + modifier summary (after B4).

**Acceptance:** completing a POS sale appears as **New** in Kitchen Display;
advancing it updates the kanban; table and items render.

---

### B3 — UPOS parity polish (~0.5 day) — ✅ DONE
> Keyboard shortcuts (`shift+e/c/d/p/i`), category sub-paging (`Next »`), line price
> edit (permission `edit_product_price_from_pos_screen`), and a Past Shifts modal.
> Line **unit** dropdown and line **discount** deferred (single-unit items; discount
> needs per-line math).
1. **Line controls**: per-line unit dropdown and price/discount editing.
   - Schema: `SaleLine.unit String?` (persist what was sold, independent of the
     item's current unit).
   - Cart row: unit `<select>` (item unit options), price input (permission
     `edit_product_price_from_pos_screen`), line discount
     (`edit_product_discount_from_pos_screen`).
2. **Keyboard shortcuts** on the till root (ignore when an input/modal is
   focused): `shift+e` cash, `shift+c` cancel, `shift+d` draft, `shift+p`
   multiple pay, `shift+i` discount, `F11` full screen — same as the audit.
3. **Category drawer paging**: show ~4 sub-chips per card with `Next »` when a
   category has more.
4. **Register history UI**: "Shifts" list from `getRegisterHistory` with
   opening/closing/difference, plus a printable summary (reuse invoice print).

**Acceptance:** shortcuts work; price/discount edits respect permissions; unit
is stored on the line; past shifts list and print.

---

### B4 — Cafe features (blocking for menu, ~2 days)
1. **Modifiers** (AGENTS.md §14)
   - Schema: `ModifierGroup` (tenantId, name, min/max select), `ModifierOption`
     (groupId, name, priceDelta), `ItemModifierGroup` (itemId ↔ groupId,
     sortOrder), `SaleLineModifier` (saleLineId, optionId, name, priceDelta).
   - Types in `packages/types`; CRUD under `/catalog-meta/modifier-groups`.
   - Menu Item editor: `modifierGroups` section (registry `sectionTypes`).
   - Till: after adding a menu item with groups, open `PosModifierModal`
     (required groups must be satisfied); selected modifiers become sale-line
     rows and are included in the line total + kitchen ticket.
2. **Daily Closeout**
   - Report page (or register-close action) computing: opening float, cash
     sales, card/transfer, expenses paid from the till, expected vs counted,
     variance — per register session.
   - Export CSV/PDF using the existing reports export path.
3. **Wire Table Management**
   - Table status (available/occupied/reserved) driven by open orders
     (`orderStatus !== served`); tapping a table in the till filters to it.

**Acceptance:** a menu item with two required groups cannot be added without
choices; modifiers appear on the sale, receipt, and kitchen ticket; closeout
reconciles to the register; table grid reflects live occupancy.

---

### B5 — Deferred / polish (~0.5 day)
1. `Sale.shippingAmount` + include in total math (`saleTotals.ts`) → enable the
   shipping modal (currently read-only).
2. Structured card fields (`SalePaymentCard` or columns on `Payment`:
   last4, holder, expiry, brand) instead of encoding into `note`.
3. `GET /cash-register/current` returns `{ register: null }` with 200 instead of
   an empty body.
4. Tenant setting `allowOversell` (default false) → till warns instead of
   blocking when true.

---

## 3. Ordering and dependencies

```
B1 ──▶ B2 ──▶ B4 (modifiers need order statuses for kitchen tickets)
        └──▶ B3 (independent, can run in parallel with B2)
B5 anytime after B4
```

- **B1 first** — until now the till cannot create a customer, and register
  enforcement is only cosmetic (client-side).
- **B2 before B4** — modifier tickets need a kitchen lifecycle to land in.
- **B3 and B5 are safe resets** between the bigger batches.

## 4. Engineering notes / risks

- **Migrations:** `prisma migrate dev` does not run here (shadow DB fails from
  pre-existing drift). Use `prisma migrate diff --from-schema-datasource …
  --to-schema-datamodel … --script` → commit the SQL → `prisma db push` for the
  dev DB. Railway falls back to `db push` if `migrate deploy` fails.
- **New columns must be nullable or defaulted** (AGENTS.md §3): `orderStatus`
  defaults to `served`, `tableId`/`unit`/`shippingAmount` nullable/default 0.
- **Server-side scoping:** every new query goes through `TenantDbService`; new
  models need the standard `tenantId` + soft-delete fields.
- **Money math:** only B5 touches `saleTotals.ts` — add unit tests there before
  wiring shipping into the UI.
- **Automation:** `apps/web/middleware.ts` 404s headless browsers. Playwright
  must send a normal Chrome `userAgent` (or run headed) — already documented.
- **Environment:** verify only one API instance owns `:3001`; an unrelated
  `server.js` has repeatedly squatted the port and made every call 404.
- **Permissions:** gate price/discount edits on
  `edit_product_price_from_pos_screen` / `edit_product_discount_from_pos_screen`
  (already in `hq6RolePermissions.ts`), and register close on an admin/manager
  role.

## 5. Test plan additions

- Unit: order-status transitions; closeout variance math; modifier price deltas
  in `computePosTotals`.
- Contract: `POST /sales` rejects when no register is open (VC), accepts with
  one; `orderStatus` round-trips; modifiers persist with the line.
- E2E (staging, UA-spoofed): add customer → add table → add item with required
  modifiers → pay → appears as **New** in Kitchen Display → advance to Ready →
  close register → closeout variance = 0.

## 6. Explicitly out of scope

- Hardware receipt printers / cash drawers (browser print only).
- Loyalty / reward points, advance balance, customer credit.
- Offline mode, weighing scale.
- Migrating the historical cafe catalog (Phase 5 cutover handles it).
