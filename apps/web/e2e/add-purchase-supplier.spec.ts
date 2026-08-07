import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";

test.beforeEach(async ({ page }) => {
  await installMockApi(page);
});

test.skip(
  !process.env.E2E_INTERACTIONS,
  "Covered by supplierTextSearchWhere + supplier API source contracts",
);

test("Add Purchase supplier typeahead finds Sunny Day from the full list", async ({
  page,
}) => {
  await page.goto("/VA/add-purchase");
  await expect(page.locator(".hq6-form-label", { hasText: "Supplier" })).toBeVisible({
    timeout: 45_000,
  });

  await page.locator(".hq6-form-label", { hasText: "Supplier" }).locator("button, [role='button']").first().click({ force: true });
  const search = page.getByPlaceholder(/search/i).first();
  await expect(search).toBeVisible({ timeout: 10_000 });
  await search.fill("Sunny Day");

  await expect(page.getByText(/Sunny Day number seven/i).first()).toBeVisible({
    timeout: 15_000,
  });
});
