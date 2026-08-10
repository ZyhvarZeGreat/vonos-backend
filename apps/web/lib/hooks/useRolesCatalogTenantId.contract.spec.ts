import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

describe("useRolesCatalogTenantId (source contracts)", () => {
  it("uses tenant_vag_001 on admin HRM roles for VAG before route tenant", () => {
    const hookSrc = read("lib/hooks/useRolesCatalogTenantId.ts");
    expect(hookSrc).toContain('VAG_TENANT_ID = "tenant_vag_001"');
    expect(hookSrc).toContain('pathname?.startsWith("/admin/hrm/roles")');
    expect(hookSrc).toContain("isVag");
    // Shared catalog must win over entity switcher on admin HRM roles.
    const vagBlock = hookSrc.indexOf('pathname?.startsWith("/admin/hrm/roles")');
    const tenantFallback = hookSrc.indexOf("if (tenantId) return tenantId");
    expect(vagBlock).toBeGreaterThan(-1);
    expect(tenantFallback).toBeGreaterThan(vagBlock);
  });

  it("roles list and detail use the catalog tenant hook and shared copy", () => {
    const listSrc = read("components/pages/Hq6UserManagementViews.tsx");
    const detailSrc = read("components/pages/Hq6RoleDetailView.tsx");
    expect(listSrc).toContain("useRolesCatalogTenantId");
    expect(listSrc).toContain("Shared across all entities");
    expect(listSrc).toContain('can("roles.update")');
    expect(detailSrc).toContain("useRolesCatalogTenantId");
    expect(detailSrc).toContain("shared across all operating entities");
    expect(detailSrc).toContain("canEditMatrix");
    expect(detailSrc).toContain('queryKey: ["tenant-role"]');
    expect(listSrc).toContain('queryKey: ["tenant-role"]');
  });

  it("VAG HRM roles pages skip the entity gate and viewing-tenant header", () => {
    const gateSrc = read("components/molecules/AdminHrmTenantGate.tsx");
    expect(gateSrc).toContain('pathname.startsWith("/admin/hrm/roles")');
    expect(gateSrc).toContain("isRolesHrm");
    const actionBarSrc = read("components/molecules/HrmActionBar.tsx");
    expect(actionBarSrc).toContain('"/admin/hrm/roles/new/edit"');
    expect(actionBarSrc).toContain('"/admin/hrm/roles"');
    const viewingSrc = read("lib/api/viewingTenant.ts");
    expect(viewingSrc).toContain('parts[2] === "roles"');
  });
});
