import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";
import { purchaseRowActions } from "../lib/hq6/rowActionCatalog";

test.beforeEach(async ({ page }) => {
  await installMockApi(page);
});

test.skip(
  !process.env.E2E_INTERACTIONS,
  "Covered by Vitest purchase action catalog + source contracts",
);

test("purchases Actions dropdown includes Add Payment near the top", async ({
  page,
}) => {
  await page.goto("/VA/purchases");
  await expect(page.getByText("PO-1001").first()).toBeVisible({
    timeout: 45_000,
  });

  await page.locator(".hq6-actions-toggle").first().click();
  for (const spec of purchaseRowActions({ canAddPayment: true })) {
    await expect(page.getByRole("menuitem", { name: spec.label })).toBeVisible();
  }
});
