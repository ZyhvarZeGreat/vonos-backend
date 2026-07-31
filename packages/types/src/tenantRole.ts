import type { Role } from "./role";

/** Per-tenant HQ6 / Ultimate POS job role (permission matrix). */
export interface TenantRole {
  id: string;
  tenantId: string;
  name: string;
  permissions: string[];
  isServiceStaff: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRoleRequest {
  name: string;
  permissions?: string[];
  isServiceStaff?: boolean;
  locked?: boolean;
}

export interface UpdateTenantRoleRequest {
  name?: string;
  permissions?: string[];
  isServiceStaff?: boolean;
}

export interface ImportTenantRolesRequest {
  roles: Array<{
    name: string;
    permissions?: string[];
    isServiceStaff?: boolean;
    locked?: boolean;
  }>;
}

/** Default demo role names seeded when a tenant has no roles yet. */
export const TENANT_ROLE_DEMO_NAMES = [
  "AC TECHNICIAN",
  "ACCOUNTANT",
  "Admin",
  "Assistant Manager",
  "AUTO-ELECTRICIAN",
  "AUTO-MECHANIC",
  "AUTO-REPAIR QC OFFICER",
  "BODY WORKS AND PAINTING",
  "CAR WASH ATTENDANT",
  "CLEANER",
  "Domestic Driver",
  "FRONT DESK",
  "HEAD OF TRAINIING",
  "HR & OPERATIONS MANAGER",
  "INTERN",
  "MACHINIST",
  "MANAGER",
  "Manager1",
  "NYSC INTERN",
  "OFFICE ASSISTANT",
  "PARTS AUDITOR",
  "PARTS MANAGEMENT",
  "QUALITY CONTROL OFFICER",
  "SALES REPRESENTATIVE/MARKETERS",
  "SECURITY/CLEANING",
  "Service Staff",
  "SOCIAL MEDIA MANAGER",
  "TECHNICAL SUPERVISOR",
  "WEB DEVELOPER",
] as const;

export function isFullAccessTenantRole(role: {
  locked: boolean;
  name: string;
}): boolean {
  if (role.locked) return true;
  return role.name.trim().toLowerCase() === "admin";
}

/**
 * Maps a tenant job role onto the JWT Role enum required by the API.
 */
export function mapTenantRoleToJwtRole(role: {
  locked: boolean;
  name: string;
  permissions: string[];
}): Exclude<Role, "super_admin"> {
  if (isFullAccessTenantRole(role)) return "admin";

  const perms = new Set(role.permissions);
  const name = role.name.trim().toLowerCase();

  if (
    perms.has("user.create") ||
    perms.has("user.delete") ||
    perms.has("roles.create") ||
    perms.has("roles.delete") ||
    perms.has("business_settings.access")
  ) {
    return "admin";
  }

  if (
    perms.has("essentials.approve_leave") ||
    perms.has("purchase.update_status") ||
    perms.has("user.update") ||
    name.includes("manager") ||
    name.includes("supervisor") ||
    name.includes("head of")
  ) {
    return "manager";
  }

  if (
    name.includes("intern") ||
    name.includes("cleaner") ||
    name.includes("security") ||
    name.includes("viewer") ||
    name === "nysc intern"
  ) {
    return "viewer";
  }

  return "staff";
}
