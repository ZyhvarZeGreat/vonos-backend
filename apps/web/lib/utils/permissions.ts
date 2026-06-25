import type { Role } from "@vonos/types";

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

export function hasPermission(role: Role, capability: Capability): boolean {
  return permissionMatrix[role].includes(capability);
}

export function hasRole(role: Role, required: Role | Role[]): boolean {
  const requiredRoles = Array.isArray(required) ? required : [required];
  return requiredRoles.includes(role);
}
