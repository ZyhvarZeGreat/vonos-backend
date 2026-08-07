import { expect, test } from "@playwright/test";
import {
  HQ6_CHECKLIST,
  HQ6_CHECKLIST_CORE_AUDITS,
} from "../lib/registries/hq6Checklist";
import { installMockApi } from "./fixtures/mockApi";

test.beforeEach(async ({ page }) => {
  await installMockApi(page);
});

test("HQ6 checklist page lists all 71 audit routes", async ({ page }) => {
  await page.goto("/VA/hq6-checklist");
  await expect(page.getByText("00_home").first()).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole("link", { name: "/VA/sales" })).toBeVisible();
  await expect(page.getByRole("link", { name: "/VA/purchases" })).toBeVisible();
  await expect(page.getByRole("link", { name: "/VA/add-purchase" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "/VA/payment-accounts" }),
  ).toBeVisible();
  expect(HQ6_CHECKLIST).toHaveLength(71);
});

const smokeRows = process.env.E2E_FULL_AUDIT
  ? HQ6_CHECKLIST
  : HQ6_CHECKLIST.filter((row) =>
      (HQ6_CHECKLIST_CORE_AUDITS as readonly string[]).includes(row.audit),
    );

for (const row of smokeRows) {
  test(`smoke ${row.audit} → ${row.route}`, async ({ page }) => {
    const response = await page.goto(row.route, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok() || response?.status() === 304).toBeTruthy();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("#__next, main, .hq6-page, body").first()).toBeVisible();
  });
}
