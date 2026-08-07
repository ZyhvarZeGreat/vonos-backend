import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";
import { saleRowActions } from "../lib/hq6/rowActionCatalog";

test.beforeEach(async ({ page }) => {
  await installMockApi(page);
});

test.skip(
  !process.env.E2E_INTERACTIONS,
  "Covered by Vitest action catalog + source contracts until list mocks are wired through useServerListPage",
);

test("sales Actions dropdown lists catalog items and Add Payment", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/VA/sales");
  await expect(page.getByText("2026/0001").first()).toBeVisible({
    timeout: 45_000,
  });

  const actions = page.locator(".hq6-actions-toggle").first();
  await expect(actions, pageErrors.join("\n")).toBeVisible();
  await actions.click();

  const expected = saleRowActions("finalized", { canAddPayment: true });
  for (const spec of expected) {
    await expect(page.getByRole("menuitem", { name: spec.label })).toBeVisible();
  }

  const addPayment = page.getByRole("menuitem", { name: "Add Payment" });
  const print = page.getByRole("menuitem", { name: "Print Invoice" });
  const addBox = await addPayment.boundingBox();
  const printBox = await print.boundingBox();
  expect(addBox && printBox && addBox.y < printBox.y).toBeTruthy();

  await addPayment.click();
  await expect(
    page.getByRole("heading", { name: /add payment/i }).or(
      page.getByText(/payment account/i),
    ),
  ).toBeVisible({ timeout: 15_000 });
});
