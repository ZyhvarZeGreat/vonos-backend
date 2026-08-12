import { describe, expect, it } from "vitest";
import { hasPermission, hasHq6PermissionKey } from "./permissions";

describe("hasPermission (AGENTS.md role matrix)", () => {
  it("viewer is dashboard-only", () => {
    expect(hasPermission("viewer", "viewDashboard")).toBe(true);
    expect(hasPermission("viewer", "createRecord")).toBe(false);
    expect(hasPermission("viewer", "manageUsers")).toBe(false);
  });

  it("staff can create but not approve or manage users", () => {
    expect(hasPermission("staff", "createRecord")).toBe(true);
    expect(hasPermission("staff", "approveReject")).toBe(false);
    expect(hasPermission("staff", "manageUsers")).toBe(false);
  });

  it("manager can approve", () => {
    expect(hasPermission("manager", "approveReject")).toBe(true);
    expect(hasPermission("manager", "manageUsers")).toBe(false);
  });

  it("admin has tenant capabilities but not entity switcher", () => {
    expect(hasPermission("admin", "manageUsers")).toBe(true);
    expect(hasPermission("admin", "editSettings")).toBe(true);
    expect(hasPermission("admin", "entitySwitcher")).toBe(false);
    expect(hasPermission("admin", "accessOtherTenants")).toBe(false);
  });

  it("super_admin can switch entities", () => {
    expect(hasPermission("super_admin", "entitySwitcher")).toBe(true);
    expect(hasPermission("super_admin", "accessOtherTenants")).toBe(true);
  });

  it("HQ6 role keys override staff when bound", () => {
    expect(
      hasPermission("staff", "createRecord", {
        tenantRolePermissions: ["sell.view"],
      }),
    ).toBe(false);
    expect(
      hasPermission("staff", "createRecord", {
        tenantRolePermissions: ["sell.create"],
      }),
    ).toBe(true);
  });
});

describe("hasHq6PermissionKey", () => {
  it("grants role matrix edits from TenantRole permissions", () => {
    expect(
      hasHq6PermissionKey("roles.update", { fallbackRole: "admin" }),
    ).toBe(true);
    expect(
      hasHq6PermissionKey("roles.update", {
        fallbackRole: "manager",
        tenantRolePermissions: ["roles.update"],
      }),
    ).toBe(true);
    expect(
      hasHq6PermissionKey("roles.update", {
        fallbackRole: "manager",
        tenantRolePermissions: ["user.view"],
      }),
    ).toBe(false);
    expect(
      hasHq6PermissionKey("roles.update", { fallbackRole: "super_admin" }),
    ).toBe(true);
  });

  it("admin bypasses HQ6 key checks", () => {
    expect(
      hasHq6PermissionKey("sell.delete", { fallbackRole: "admin" }),
    ).toBe(true);
  });
});
