import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";

test.beforeEach(async ({ page }) => {
  await installMockApi(page);
});

test.skip(
  !process.env.E2E_INTERACTIONS,
  "Covered by paymentAccountPicker unit tests on web + API",
);

test("Add Payment account picker shows banks, not chart junk", async ({
  page,
}) => {
  await page.goto("/VA/sales");
  await expect(page.getByText("2026/0001").first()).toBeVisible({
    timeout: 45_000,
  });
  await page.locator(".hq6-actions-toggle").first().click();
  await page.getByRole("menuitem", { name: "Add Payment" }).click();

  await expect(page.getByText(/payment account|account/i).first()).toBeVisible({
    timeout: 15_000,
  });

  const search = page.getByPlaceholder(/search accounts|search/i).first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill("Monie");
  } else {
    await page.getByText(/none|select|account/i).first().click({ force: true });
    await page.keyboard.type("Monie");
  }

  await expect(page.getByText("Moniepoint").first()).toBeVisible();
  await expect(page.getByText("Assets", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Address to new bill")).toHaveCount(0);
});
