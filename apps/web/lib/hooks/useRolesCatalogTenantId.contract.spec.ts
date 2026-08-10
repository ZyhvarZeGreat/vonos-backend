import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

describe("useRolesCatalogTenantId (source contracts)", () => {
  it("falls back to tenant_vag_001 on admin HRM roles for VAG", () => {
    const hookSrc = read("lib/hooks/useRolesCatalogTenantId.ts");
    expect(hookSrc).toContain('VAG_TENANT_ID = "tenant_vag_001"');
    expect(hookSrc).toContain('pathname?.startsWith("/admin/hrm/roles")');
    expect(hookSrc).toContain("isVag");
  });

  it("roles list and detail use the catalog tenant hook and shared copy", () => {
    const listSrc = read("components/pages/Hq6UserManagementViews.tsx");
    const detailSrc = read("components/pages/Hq6RoleDetailView.tsx");
    expect(listSrc).toContain("useRolesCatalogTenantId");
    expect(listSrc).toContain("Shared across all entities");
    expect(detailSrc).toContain("useRolesCatalogTenantId");
    expect(detailSrc).toContain("shared across all operating entities");
    expect(detailSrc).toContain('queryKey: ["tenant-role"]');
    expect(listSrc).toContain('queryKey: ["tenant-role"]');
  });
});
