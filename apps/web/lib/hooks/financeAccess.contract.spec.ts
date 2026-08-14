import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

describe("finance permission gating (source contracts)", () => {
  it("JWT fallback never implies finance keys for staff/manager", () => {
    const src = read("lib/hooks/useHq6Permissions.ts");
    expect(src).toContain("isFinancePermissionKey");
    expect(src).toContain("if (isFinancePermissionKey(key))");
    expect(src).toContain("return false");
  });

  it("tenant layout filters nav by permissions", () => {
    const src = read("app/(dashboard)/[tenant]/layout.tsx");
    expect(src).toContain("filterNavSectionsByPermissions");
    expect(src).toContain("useAppPermissions");
  });

  it("FinanceView requires finance access keys", () => {
    const src = read("components/pages/FinanceView.tsx");
    expect(src).toContain("FINANCE_ACCESS_PERMISSION_KEYS");
    expect(src).toContain("canViewFinance");
    expect(src).toContain("Finance restricted");
  });

  it("HQ6 tenant sidebar includes the Finance page (Roles Financial dashboard)", () => {
    const src = read("lib/registries/posNavSections.ts");
    expect(src).toContain('route: r(code, "finance")');
    expect(src).toContain('label: "Finance"');
  });
});
