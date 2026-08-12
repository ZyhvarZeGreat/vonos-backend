import { describe, expect, it } from "vitest";
import { canAccessTenant, getPostLoginPath } from "./authRedirect";

describe("getPostLoginPath", () => {
  it("sends super_admin to group overview", () => {
    expect(getPostLoginPath("super_admin", null)).toBe("/admin/overview");
  });

  it("sends HR TenantRole users to group overview", () => {
    expect(
      getPostLoginPath("manager", "tenant_va_001", "HR & OPERATIONS MANAGER"),
    ).toBe("/admin/overview");
    expect(getPostLoginPath("admin", "tenant_vw_001", "HR")).toBe(
      "/admin/overview",
    );
  });

  it("sends tenant users to their overview", () => {
    expect(getPostLoginPath("admin", "tenant_va_001")).toBe("/VA/overview");
    expect(getPostLoginPath("staff", "tenant_vw_001")).toBe("/VW/overview");
    expect(getPostLoginPath("admin", "tenant_vs_001")).toBe(
      "/operations/VS/overview",
    );
    expect(getPostLoginPath("admin", "tenant_vc_001")).toBe(
      "/operations/VC/overview",
    );
    expect(getPostLoginPath("manager", "tenant_vkw_001")).toBe(
      "/operations/VKW/overview",
    );
  });
});

describe("canAccessTenant", () => {
  it("allows super_admin everywhere and scopes others", () => {
    expect(canAccessTenant("super_admin", null, "tenant_va_001")).toBe(true);
    expect(canAccessTenant("admin", "tenant_va_001", "tenant_va_001")).toBe(
      true,
    );
    expect(canAccessTenant("admin", "tenant_va_001", "tenant_vw_001")).toBe(
      false,
    );
    expect(canAccessTenant(null, "tenant_va_001", "tenant_va_001")).toBe(false);
  });

  it("allows HR portal users across entities", () => {
    expect(
      canAccessTenant(
        "manager",
        "tenant_va_001",
        "tenant_vw_001",
        "HR & OPERATIONS MANAGER",
      ),
    ).toBe(true);
  });
});
