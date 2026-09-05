import type { Page, Route } from "@playwright/test";

export const API_ORIGINS = [
  "http://127.0.0.1:3999",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
] as const;

const API_ORIGIN = API_ORIGINS[0];
const TENANT_ID = "tenant_va_001";

const dueSale = {
  id: "sale_due_1",
  tenantId: TENANT_ID,
  reference: "2026/0001",
  date: "2026-08-01T10:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  customerId: "cust_1",
  customerName: "Walk-in Customer",
  status: "Completed",
  recordStatus: "completed",
  paymentStatus: "due",
  paymentMethod: "cash",
  total: 150000,
  totalPaid: 0,
  sellDue: 150000,
  currency: "NGN",
  locationCode: "BL0001",
  itemCount: 1,
  discountAmount: 0,
  taxAmount: 0,
  notes: null,
  updatedAt: "2026-08-01T10:00:00.000Z",
};

const paidSale = {
  ...dueSale,
  id: "sale_paid_1",
  reference: "2026/0002",
  paymentStatus: "paid",
  totalPaid: 150000,
  sellDue: 0,
};

const purchaseDue = {
  id: "po_due_1",
  tenantId: TENANT_ID,
  reference: "PO-1001",
  date: "2026-08-01T09:00:00.000Z",
  supplierId: "sup_sunny",
  supplierName: "Sunny Day number seven",
  supplierOrDest: "Sunny Day number seven",
  status: "Received",
  paymentStatus: "due",
  paymentDue: 80000,
  grandTotal: 80000,
  total: 80000,
  currency: "NGN",
  locationCode: "BL0001",
  type: "inbound",
};

const suppliers = [
  {
    id: "sup_sunny",
    tenantId: TENANT_ID,
    name: "Sunny Day number seven",
    contactName: "Sunny",
    phone: "08011112222",
    email: "sunny@example.com",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sup_other",
    tenantId: TENANT_ID,
    name: "Acme Filters Ltd",
    contactName: "Ada",
    phone: "08033334444",
    email: "ada@acme.test",
    status: "active",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

const paymentAccounts = [
  {
    id: "acc_monie",
    tenantId: TENANT_ID,
    name: "Moniepoint",
    accountNumber: "1234567890",
    isClosed: false,
    isDefault: true,
    openingBalance: 0,
    currentBalance: 50000,
  },
  {
    id: "acc_providus",
    tenantId: TENANT_ID,
    name: "Providus",
    accountNumber: "0987654321",
    isClosed: false,
    isDefault: false,
    openingBalance: 0,
    currentBalance: 120000,
  },
  {
    id: "acc_cash",
    tenantId: TENANT_ID,
    name: "Cash Received",
    accountNumber: null,
    isClosed: false,
    isDefault: false,
    openingBalance: 0,
    currentBalance: 10000,
  },
  {
    id: "acc_junk_assets",
    tenantId: TENANT_ID,
    name: "Assets",
    accountNumber: null,
    isClosed: false,
    isDefault: false,
    openingBalance: 0,
    currentBalance: 0,
  },
  {
    id: "acc_junk_bill",
    tenantId: TENANT_ID,
    name: "Address to new bill",
    accountNumber: null,
    isClosed: false,
    isDefault: false,
    openingBalance: 0,
    currentBalance: 0,
  },
];

function corsHeaders(route: Route): Record<string, string> {
  const origin = route.request().headers().origin ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Viewing-Tenant",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: corsHeaders(route),
    body: JSON.stringify(body),
  });
}

function apiPath(url: URL): string {
  return url.pathname.replace(/\/+$/, "");
}

export type MockApiOptions = {
  tenantConfig?: Record<string, unknown>;
  items?: Array<Record<string, unknown> & { id: string }>;
  onItemCreate?: (body: unknown) => void;
  onItemUpdate?: (id: string, body: unknown) => void;
  /** Artificial PATCH latency — used to assert optimistic leave before response. */
  itemUpdateDelayMs?: number;
};

export async function installMockApi(page: Page, options: MockApiOptions = {}) {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.documentElement.appendChild(style);
  });

  const catalogItems = [...(options.items ?? [])];

  const handleApi = async (route: Route): Promise<void> => {
    const request = route.request();
    const url = new URL(request.url());
    const path = apiPath(url);
    const method = request.method();

    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders(route) });
    }

    if (path.match(/\/tenants\/[^/]+\/config$/)) {
      return json(
        route,
        options.tenantConfig ?? {
          tenantId: TENANT_ID,
          code: "VA",
          name: "Vonos Mechanic",
          archetype: "job",
          navItems: [],
          kpiCards: [],
          terminology: {},
          enabledModules: ["sales", "purchases", "finance"],
          businessLocations: [
            { code: "BL0001", name: "Head Office", isDefault: true },
          ],
        },
      );
    }

    if (path.startsWith("/overview")) {
      if (path.includes("/panels/")) {
        return json(route, {
          id: path.split("/").pop(),
          title: "Panel",
          rows: [],
        });
      }
      return json(route, {
        financeKpis: [],
        charts: [],
        currency: "NGN",
        revenue: 0,
        kpis: [],
      });
    }

    if (path.startsWith("/catalog/") && path !== "/catalog") {
      const id = path.slice("/catalog/".length).split("/")[0] ?? "";
      const existing = catalogItems.find((row) => row.id === id);
      if (existing) return json(route, existing);
      return json(route, { message: "Item not found" }, 404);
    }

    if (path === "/catalog" && method === "GET") {
      return json(route, {
        items: catalogItems,
        totalCount: catalogItems.length,
      });
    }

    if (path.startsWith("/catalog-meta")) {
      if (path.includes("/units")) {
        return json(route, [
          { id: "unit_single", name: "Single", shortName: "sng" },
          { id: "unit_piece", name: "Piece", shortName: "pc" },
        ]);
      }
      return json(route, []);
    }

    if (path === "/items" || path.startsWith("/items/")) {
      if (method === "POST") {
        const body = request.postDataJSON();
        options.onItemCreate?.(body);
        return json(
          route,
          {
            id: "item_new_1",
            tenantId: "tenant_visp_001",
            locationStock: [],
            status: "out_of_stock",
            currency: "NGN",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...(body as object),
          },
          201,
        );
      }
      if (
        (method === "POST" || method === "PATCH") &&
        path.includes("/opening-stock")
      ) {
        const id = path.slice("/items/".length).split("/")[0] ?? "";
        const body = request.postDataJSON() as {
          locationCode?: string;
          costPrice?: number;
          rows?: Array<{
            id?: string;
            quantity: number;
            unitCost: number;
            date: string;
            note?: string;
          }>;
        };
        options.onItemUpdate?.(id, body);
        const idx = catalogItems.findIndex((row) => row.id === id);
        const existing = idx >= 0 ? catalogItems[idx]! : { id };
        const qty = (body.rows ?? []).reduce(
          (sum, row) => sum + (Number(row.quantity) || 0),
          0,
        );
        const loc = body.locationCode ?? "VISP";
        const updated = {
          ...existing,
          quantity: qty,
          costPrice: body.costPrice ?? (existing as { costPrice?: number }).costPrice,
          locationCode: loc,
          locationStock: [
            {
              locationCode: loc,
              binLocation: null,
              quantity: qty,
            },
          ],
          updatedAt: new Date().toISOString(),
        };
        if (idx >= 0) catalogItems[idx] = updated;
        return json(route, updated);
      }
      if (method === "PATCH") {
        const id = path.slice("/items/".length).split("/")[0] ?? "";
        const body = request.postDataJSON();
        options.onItemUpdate?.(id, body);
        const idx = catalogItems.findIndex((row) => row.id === id);
        const existing = idx >= 0 ? catalogItems[idx]! : { id };
        const updated = {
          ...existing,
          ...(body as object),
          updatedAt: new Date().toISOString(),
        };
        if (idx >= 0) {
          catalogItems[idx] = updated;
        }
        const delay = options.itemUpdateDelayMs ?? 0;
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }
        return json(route, updated);
      }
      if (method === "GET" && path !== "/items") {
        if (path.endsWith("/kpi-summary")) {
          return json(route, {
            totalSkus: catalogItems.length,
            lowStock: 0,
            outOfStock: 0,
            inventoryValue: 0,
            currency: "NGN",
          });
        }
        const id = path.slice("/items/".length).split("/")[0] ?? "";
        const existing = catalogItems.find((row) => row.id === id);
        if (!existing) return json(route, { message: "Item not found" }, 404);
        if (path.endsWith("/meta")) {
          return json(route, {
            id: existing.id,
            name: existing.name,
            sku: existing.sku,
          });
        }
        if (path.endsWith("/stock-history")) {
          return json(route, []);
        }
        if (path.endsWith("/opening-stock")) {
          return json(route, []);
        }
        return json(route, existing);
      }
      return json(route, {
        items: catalogItems,
        totalCount: catalogItems.length,
      });
    }

    if (path === "/sales" || path.startsWith("/sales/")) {
      if (method !== "GET") return json(route, { ok: true });
      return json(route, {
        items: [dueSale, paidSale],
        totalCount: 2,
        amountSummary: {
          totalAmount: 300000,
          totalPaid: 150000,
          totalDue: 150000,
          currency: "NGN",
        },
      });
    }

    if (path === "/stock-movements" || path.startsWith("/stock-movements/")) {
      if (method !== "GET") return json(route, { ok: true });
      return json(route, { items: [purchaseDue], totalCount: 1 });
    }

    if (path === "/purchases" || path.startsWith("/purchases/")) {
      if (method !== "GET") return json(route, { ok: true });
      return json(route, { items: [purchaseDue], totalCount: 1 });
    }

    if (path === "/suppliers" || path.startsWith("/suppliers/")) {
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const matched = search
        ? suppliers.filter((s) => {
            const hay = `${s.name} ${s.contactName}`.toLowerCase();
            return (
              hay.includes(search) ||
              search.split(/\s+/).every((token) => hay.includes(token))
            );
          })
        : suppliers;
      return json(route, { items: matched, totalCount: matched.length });
    }

    if (path === "/payment-accounts" || path.startsWith("/payment-accounts/")) {
      const openOnly =
        url.searchParams.get("openOnly") === "1" ||
        url.searchParams.get("openOnly") === "true";
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      let rows = paymentAccounts.filter((account) => !account.isClosed);
      if (openOnly) {
        rows = rows.filter(
          (account) => !/^(assets?|address\s+to\s+new\s+bill)/i.test(account.name),
        );
      }
      if (search) {
        rows = rows.filter((account) =>
          account.name.toLowerCase().includes(search),
        );
      }
      return json(route, rows);
    }

    if (path === "/payments" || path.startsWith("/payments/")) {
      if (method === "POST") {
        return json(route, {
          id: "pay_new_1",
          saleId: dueSale.id,
          amount: 150000,
          method: "cash",
        });
      }
      return json(route, { items: [], totalCount: 0 });
    }

    if (path === "/notifications" || path.startsWith("/notifications/")) {
      if (method === "GET") return json(route, []);
      return json(route, { ok: true });
    }

    if (method === "GET") return json(route, { items: [], totalCount: 0 });
    return json(route, { ok: true });
  };

  await page.route("**/*", async (route) => {
    const type = route.request().resourceType();
    if (
      type === "document" ||
      type === "stylesheet" ||
      type === "script" ||
      type === "image" ||
      type === "font" ||
      type === "media"
    ) {
      return route.continue();
    }

    let url: URL;
    try {
      url = new URL(route.request().url());
    } catch {
      return route.continue();
    }

    const mockedOrigin =
      (API_ORIGINS as readonly string[]).includes(url.origin) ||
      url.port === "3999" ||
      url.port === "3001";
    if (!mockedOrigin) return route.continue();
    return handleApi(route);
  });
}

export const mockData = {
  dueSale,
  paidSale,
  purchaseDue,
  suppliers,
  paymentAccounts,
  TENANT_ID,
};
