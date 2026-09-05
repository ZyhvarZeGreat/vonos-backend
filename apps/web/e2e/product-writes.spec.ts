import { expect, test, type Locator, type Page } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";

const EDIT_ID = "imp_shuiyz06ar7layu9h3h2481c";

const editItem = {
  id: EDIT_ID,
  tenantId: "tenant_visp_001",
  sku: "OF-100",
  name: "Oil filter",
  category: "Filters",
  subCategory: null,
  description: "OEM filter",
  barcodeType: "C128",
  unit: "Single",
  weight: null,
  carModel: "Camry",
  enableImei: false,
  preparationMinutes: null,
  quantity: 42,
  binLocation: null,
  locationCode: "VISP",
  reorderPoint: 2,
  costPrice: 2500,
  sellPrice: 4000,
  currency: "NGN",
  status: "in_stock",
  availableForRetail: true,
  brandId: null,
  brandName: "Bosch",
  locationStock: [
    {
      id: "ils_1",
      itemId: EDIT_ID,
      locationCode: "VISP",
      binLocation: null,
      quantity: 42,
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const openingStockEditItem = {
  id: "ils_opening_edit_1",
  tenantId: "tenant_visp_001",
  sku: "OS-1",
  name: "Oil filter (opening)",
  category: "Filters",
  subCategory: null,
  description: "OEM filter",
  barcodeType: "C128",
  unit: "Single",
  weight: null,
  carModel: "Camry",
  enableImei: false,
  preparationMinutes: null,
  quantity: 10,
  binLocation: null,
  locationCode: "VISP",
  reorderPoint: 2,
  costPrice: 2500,
  sellPrice: 4000,
  currency: "NGN",
  status: "in_stock",
  availableForRetail: true,
  brandId: null,
  brandName: "Bosch",
  locationStock: [
    {
      id: "ils_open_1",
      itemId: "ils_opening_edit_1",
      locationCode: "VISP",
      binLocation: null,
      quantity: 10,
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const vispConfig = {
  tenantId: "tenant_visp_001",
  code: "VISP",
  name: "Vonos Institute Spare Parts",
  archetype: "transaction",
  navItems: [],
  kpiCards: [],
  terminology: {},
  enabledModules: ["sales", "products"],
  businessLocations: [
    { code: "VW", name: "Vonos Warehouse" },
    { code: "VISP", name: "Vonos Institute Spare Parts" },
    { code: "VSP", name: "Vonos SP Marketplace" },
  ],
};

async function dismissDevOverlay(page: Page) {
  await page.evaluate(() => {
    document.querySelector("nextjs-portal")?.remove();
  });
}

async function fillControlled(locator: Locator, value: string) {
  await locator.waitFor({ state: "attached", timeout: 45_000 });
  await expect
    .poll(
      async () => {
        await locator.evaluate((el, next) => {
          const input = el as HTMLInputElement & {
            _valueTracker?: { setValue: (v: string) => void };
          };
          const proto = Object.getPrototypeOf(input) as HTMLInputElement;
          const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
          const previous = input.value;
          setter?.call(input, next);
          input._valueTracker?.setValue(previous);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }, value);
        return locator.inputValue();
      },
      { timeout: 10_000 },
    )
    .toBe(value);
}

test("add product without location posts a create payload", async ({ page }) => {
  const capture: { posted?: unknown } = {};
  await installMockApi(page, {
    tenantConfig: vispConfig,
    onItemCreate: (body) => {
      capture.posted = body;
    },
  });

  await page.goto("/VISP/add-product");
  await expect(page.locator("#name")).toBeAttached({ timeout: 45_000 });
  await expect(page.locator("#unit_id option").first()).toBeAttached();
  await dismissDevOverlay(page);
  await fillControlled(page.locator("#sku"), "SMK-1");
  await fillControlled(page.locator("#cost_price"), "1000");
  await fillControlled(page.locator("#sell_price"), "1800");
  await fillControlled(page.locator("#name"), "Smoke filter");
  await expect(page.locator("#name")).toHaveValue("Smoke filter");

  await page.getByRole("button", { name: /^Save$/ }).click({ force: true });
  await expect(page.getByText("Product name is required.")).toHaveCount(0);

  await expect.poll(() => capture.posted, { timeout: 20_000 }).toBeTruthy();
  const posted = capture.posted as Record<string, unknown>;
  expect(posted.name).toBe("Smoke filter");
  expect(posted.sku).toBe("SMK-1");
  expect(posted.costPrice).toBe(1000);
  expect(posted.sellPrice).toBe(1800);
  expect(posted.locationCode).toBeUndefined();
  expect(posted.locationStock).toBeUndefined();
});

test("selling price does not snap back to unit cost after typing", async ({
  page,
}) => {
  const capture: { posted?: unknown } = {};
  await installMockApi(page, {
    tenantConfig: vispConfig,
    onItemCreate: (body) => {
      capture.posted = body;
    },
  });

  await page.goto("/VISP/add-product");
  await expect(page.locator("#name")).toBeAttached({ timeout: 45_000 });
  await dismissDevOverlay(page);

  await fillControlled(page.locator("#name"), "Brake pad");
  await fillControlled(page.locator("#sku"), "BP-35");
  await fillControlled(page.locator("#cost_price"), "30000");
  // At 0% margin, sell must stay empty / not auto-copy cost.
  await expect(page.locator("#sell_price")).toHaveValue("");
  await fillControlled(page.locator("#sell_price"), "35000");
  // Regression: sell used to snap back to unit cost (30000).
  await expect(page.locator("#sell_price")).toHaveValue("35000");
  await expect(page.locator("#cost_price")).toHaveValue("30000");

  await page.getByRole("button", { name: /^Save$/ }).click({ force: true });
  await expect.poll(() => capture.posted, { timeout: 20_000 }).toBeTruthy();
  const posted = capture.posted as Record<string, unknown>;
  expect(posted.costPrice).toBe(30000);
  expect(posted.sellPrice).toBe(35000);
});

test("edit product save patches sell price without zeroing stock", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const capture: { patched?: unknown } = {};
  await installMockApi(page, {
    tenantConfig: vispConfig,
    items: [editItem],
    onItemUpdate: (_id, body) => {
      capture.patched = body;
    },
  });

  // Warm catalog list so soft-nav after save reuses the list query.
  await page.goto("/VISP/catalog", { waitUntil: "domcontentloaded" });
  await dismissDevOverlay(page);
  const listRow = page.locator("tr").filter({ hasText: "Oil filter" }).first();
  await expect(listRow).toBeVisible({ timeout: 45_000 });
  await expect(listRow).toContainText("4,000");

  await page.goto(`/VISP/add-product?edit=${EDIT_ID}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText(/Could not load that product/i)).toHaveCount(0);
  await expect(page.locator("#name")).toHaveValue("Oil filter", {
    timeout: 45_000,
  });
  await dismissDevOverlay(page);
  await expect(page.locator("#sku")).toHaveValue("OF-100");
  await expect(page.locator("#cost_price")).toHaveValue("2500");
  await expect(page.locator("#sell_price")).toHaveValue("4000");
  await expect(page.locator("#unit_id")).toHaveValue("Single");
  await expect(page.locator("#brand_id")).toHaveValue("Bosch");
  await expect(page.locator("#category_id")).toHaveValue("Filters");
  await expect(page.locator("#car_model")).toHaveValue("Camry");

  await fillControlled(page.locator("#sell_price"), "4550");
  await page.getByRole("button", { name: /^Save$/ }).click({ force: true });

  await expect.poll(() => capture.patched, { timeout: 20_000 }).toBeTruthy();
  const patched = capture.patched as Record<string, unknown>;
  expect(patched.sellPrice).toBe(4550);
  expect(patched.costPrice).toBe(2500);
  expect(patched).not.toHaveProperty("quantity");
  expect(patched.locationStock).toBeUndefined();

  // Soft-nav back — updated sell price without a hard refresh.
  await expect(page).toHaveURL(/\/VISP\/catalog/, { timeout: 20_000 });
  const updatedRow = page.locator("tr").filter({ hasText: "Oil filter" }).first();
  await expect(updatedRow).toBeVisible({ timeout: 45_000 });
  await expect(updatedRow).toContainText("4,550");
});

test("edit product leaves catalog before slow PATCH resolves", async ({
  page,
}) => {
  test.setTimeout(120_000);
  let patchStartedAt = 0;
  let patchFinishedAt = 0;
  let navigatedAt = 0;

  await installMockApi(page, {
    tenantConfig: vispConfig,
    items: [editItem],
    itemUpdateDelayMs: 2500,
    onItemUpdate: () => {
      patchStartedAt = Date.now();
    },
  });

  // Detect when mock fulfills by watching response timing via route is awkward;
  // instead mark finish when capture gets body after delay by polling network.
  page.on("response", (res) => {
    if (res.request().method() === "PATCH" && res.url().includes("/items/")) {
      patchFinishedAt = Date.now();
    }
  });
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && /\/VISP\/catalog/.test(frame.url())) {
      if (!navigatedAt) navigatedAt = Date.now();
    }
  });

  await page.goto(`/VISP/add-product?edit=${EDIT_ID}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("#name")).toHaveValue("Oil filter", {
    timeout: 45_000,
  });
  await dismissDevOverlay(page);
  await fillControlled(page.locator("#sell_price"), "4600");
  await page.getByRole("button", { name: /^Save$/ }).click({ force: true });

  await expect(page).toHaveURL(/\/VISP\/catalog/, { timeout: 8_000 });
  expect(navigatedAt, "should soft-nav to catalog").toBeGreaterThan(0);
  await expect
    .poll(() => patchFinishedAt, { timeout: 15_000 })
    .toBeGreaterThan(0);
  expect(
    navigatedAt,
    "catalog URL must land before delayed PATCH finishes",
  ).toBeLessThan(patchFinishedAt);
  // Sanity: we actually waited on a slow mock (not an instant 0ms path).
  expect(patchFinishedAt - (patchStartedAt || navigatedAt)).toBeGreaterThan(
    1500,
  );
});

test("transaction tenant can save opening stock from catalog list", async ({
  page,
}) => {
  const capture: { patched?: unknown } = {};
  await installMockApi(page, {
    tenantConfig: vispConfig,
    items: [openingStockEditItem],
    onItemUpdate: (_id, body) => {
      capture.patched = body;
    },
  });

  await page.goto("/VISP/catalog");
  await dismissDevOverlay(page);

  const row = page.locator("tr").filter({ hasText: openingStockEditItem.name }).first();
  await expect(row).toBeVisible({ timeout: 45_000 });
  await row.getByRole("button", { name: "Actions" }).click();

  await page
    .getByRole("menuitem", { name: "Add or edit opening stock" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Add Opening Stock" });
  await expect(dialog).toBeVisible({ timeout: 45_000 });

  const numberInputs = dialog.locator('input[type="number"]');
  await fillControlled(numberInputs.nth(0), "100");
  await fillControlled(numberInputs.nth(1), "2600");

  await dialog.getByRole("button", { name: /^Save$/ }).click({ force: true });

  await expect.poll(() => capture.patched, { timeout: 20_000 }).toBeTruthy();
  const patched = capture.patched as Record<string, unknown>;

  expect(patched.costPrice).toBe(2600);
  expect(patched.locationCode).toBe("VISP");
  expect(patched.rows).toEqual([
    expect.objectContaining({
      quantity: 100,
      unitCost: 2600,
    }),
  ]);
});
