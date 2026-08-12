import type { Role } from "@vonos/types";
import { isFullAccessTenantRole } from "@vonos/types";

export type Capability =
  | "viewDashboard"
  | "createRecord"
  | "approveReject"
  | "manageUsers"
  | "editSettings"
  | "accessOtherTenants"
  | "entitySwitcher";

const permissionMatrix: Record<Role, Capability[]> = {
  viewer: ["viewDashboard"],
  staff: ["viewDashboard", "createRecord"],
  manager: ["viewDashboard", "createRecord", "approveReject"],
  admin: [
    "viewDashboard",
    "createRecord",
    "approveReject",
    "manageUsers",
    "editSettings",
  ],
  super_admin: [
    "viewDashboard",
    "createRecord",
    "approveReject",
    "manageUsers",
    "editSettings",
    "accessOtherTenants",
    "entitySwitcher",
  ],
};

/** HQ6 permission keys that satisfy each coarse capability. */
const CAPABILITY_HQ6_KEYS: Record<Capability, string[]> = {
  viewDashboard: [],
  createRecord: [
    "product.create",
    "purchase.create",
    "purchase_order.create",
    "sell.create",
    "customer.create",
    "supplier.create",
    "essentials.create_payroll",
  ],
  approveReject: ["essentials.approve_leave", "purchase.update_status"],
  manageUsers: ["user.view", "user.create", "user.update", "user.delete"],
  editSettings: ["business_settings.access", "account.access"],
  accessOtherTenants: [],
  entitySwitcher: [],
};

export interface PermissionContext {
  /** Permissions from the logged-in user's assigned TenantRole (from login). */
  tenantRolePermissions?: string[] | null;
  tenantRoleLocked?: boolean;
  tenantRoleName?: string | null;
}

function tenantRoleGrantsCapability(
  context: PermissionContext,
  capability: Capability,
): boolean {
  if (capability === "accessOtherTenants" || capability === "entitySwitcher") {
    return false;
  }
  if (
    context.tenantRoleLocked ||
    (context.tenantRoleName &&
      isFullAccessTenantRole({
        locked: Boolean(context.tenantRoleLocked),
        name: context.tenantRoleName,
      })) ||
    context.tenantRolePermissions?.includes("*")
  ) {
    return true;
  }
  if (capability === "viewDashboard") return true;

  const keys = CAPABILITY_HQ6_KEYS[capability];
  const perms = context.tenantRolePermissions ?? [];
  if (keys.length === 0) return false;
  return keys.some((key) => perms.includes(key));
}

/**
 * Coarse JWT matrix, overridden by the session's TenantRole permissions when present.
 */
export function hasPermission(
  role: Role,
  capability: Capability,
  context?: PermissionContext,
): boolean {
  if (role === "super_admin") {
    return permissionMatrix.super_admin.includes(capability);
  }
  // Tenant JWT admin always has full coarse capabilities.
  if (role === "admin") {
    return permissionMatrix.admin.includes(capability);
  }

  const hasHq6Binding =
    Boolean(context?.tenantRoleLocked) ||
    Boolean(context?.tenantRolePermissions?.includes("*")) ||
    (context?.tenantRolePermissions?.length ?? 0) > 0 ||
    Boolean(
      context?.tenantRoleName &&
        isFullAccessTenantRole({
          locked: Boolean(context.tenantRoleLocked),
          name: context.tenantRoleName,
        }),
    );

  if (hasHq6Binding && context) {
    return tenantRoleGrantsCapability(context, capability);
  }

  return permissionMatrix[role].includes(capability);
}

export function hasHq6PermissionKey(
  permissionKey: string,
  context: PermissionContext & { fallbackRole?: Role | null },
): boolean {
  if (context.fallbackRole === "super_admin") return true;
  if (context.fallbackRole === "admin") return true;
  if (
    context.tenantRoleLocked ||
    context.tenantRolePermissions?.includes("*") ||
    (context.tenantRoleName &&
      isFullAccessTenantRole({
        locked: Boolean(context.tenantRoleLocked),
        name: context.tenantRoleName,
      }))
  ) {
    return true;
  }
  const perms = context.tenantRolePermissions ?? [];
  if (perms.length > 0) {
    return perms.includes(permissionKey);
  }
  return false;
}

export function hasRole(role: Role, required: Role | Role[]): boolean {
  const requiredRoles = Array.isArray(required) ? required : [required];
  return requiredRoles.includes(role);
}
