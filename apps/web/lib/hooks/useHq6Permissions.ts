"use client";

import { useMemo } from "react";
import type { Role } from "@vonos/types";
import {
  canAccessVagPortal,
  isFinancePermissionKey,
  isFullAccessTenantRole,
} from "@vonos/types";
import { useAuthStore } from "@/stores/authStore";
import {
  notifyInsufficientPrivilege,
  type PrivilegeDenialKind,
} from "@/lib/utils/privilegeToast";

/**
 * Fallback only when the user has no TenantRole permission keys yet.
 * Tenant JWT `admin` and locked Admin roles always get full access.
 * Finance keys are never implied from JWT staff/manager/viewer — only from
 * an assigned TenantRole matrix (Accountant by default, or explicit checkbox).
 * Role-matrix keys (roles.create/update/delete) also require an explicit
 * TenantRole checkbox (or Admin / VAG full access).
 */
function jwtImpliesPermission(role: Role | null, key: string): boolean {
  if (!role) return false;
  if (
    key === "roles.create" ||
    key === "roles.update" ||
    key === "roles.delete"
  ) {
    return false;
  }
  // Financial surfaces require explicit role checkboxes (or Admin / VAG).
  if (isFinancePermissionKey(key)) {
    return false;
  }
  if (role === "super_admin") return true;
  if (role === "admin") return true;

  const isView =
    key.includes(".view") ||
    key.endsWith("_view") ||
    key.startsWith("view_") ||
    key.endsWith(".access") ||
    key.includes("view_own") ||
    key.includes("view_all");

  if (role === "viewer") return isView;

  if (role === "staff") {
    if (
      key.startsWith("user.") ||
      key.startsWith("roles.") ||
      key === "business_settings.access" ||
      key.includes(".delete")
    ) {
      return false;
    }
    return true;
  }

  // manager
  if (
    key.startsWith("roles.") ||
    key === "business_settings.access" ||
    key === "user.create" ||
    key === "user.delete"
  ) {
    return false;
  }
  return true;
}

export interface AppPermissionsApi {
  /** Exact permission key from the assigned TenantRole (Roles page). */
  can: (key: string) => boolean;
  canAny: (...keys: string[]) => boolean;
  canAll: (...keys: string[]) => boolean;
  /**
   * Like `can`, but toasts a privilege warning when denied.
   * Returns true only when allowed.
   */
  requireCan: (key: string, kind?: PrivilegeDenialKind) => boolean;
  /** Like `canAny`, with a toast when none of the keys are allowed. */
  requireCanAny: (
    keys: string[],
    kind?: PrivilegeDenialKind,
  ) => boolean;
  /** VAG portal (super_admin or HR TenantRole). */
  isVag: boolean;
  /** Full access: VAG without limited role, JWT admin, or locked Admin TenantRole. */
  isFullAccess: boolean;
  /** True when the session has concrete TenantRole permission keys. */
  hasRolePermissions: boolean;
  role: Role | null;
  permissions: string[];
}

/**
 * Entity-agnostic permission checks from the logged-in user's DB TenantRole.
 * Same rules on VA / VW / VISP / … — only the assigned role's checkboxes matter
 * for staff/manager; Admin / unrestricted VAG always pass.
 */
export function useAppPermissions(): AppPermissionsApi {
  const role = useAuthStore((s) => s.role);
  const permissions = useAuthStore((s) => s.tenantRolePermissions);
  const locked = useAuthStore((s) => s.tenantRoleLocked);
  const roleName = useAuthStore((s) => s.tenantRoleName);

  return useMemo(() => {
    const isVag = canAccessVagPortal({ role, tenantRoleName: roleName });
    const hasRolePermissions =
      permissions.length > 0 && !permissions.includes("*");
    const isFullAccessRole =
      locked ||
      permissions.includes("*") ||
      role === "admin" ||
      Boolean(
        roleName &&
          isFullAccessTenantRole({
            locked: Boolean(locked),
            name: roleName,
          }),
      );
    // VAG portal access is separate from full permission grant.
    // A VAG/HR user assigned a concrete TenantRole is limited to that
    // role's checkboxes — Finance stays off unless Financial dashboard is ticked.
    const isFullAccess =
      isFullAccessRole ||
      (isVag && !hasRolePermissions && role === "super_admin");

    const can = (key: string): boolean => {
      if (isFullAccess) return true;
      // Assigned role with checkboxes → those keys only.
      if (hasRolePermissions) return permissions.includes(key);
      return jwtImpliesPermission(role, key);
    };

    const canAny = (...keys: string[]) => keys.some((k) => can(k));

    const requireCan = (
      key: string,
      kind: PrivilegeDenialKind = "action",
    ): boolean => {
      if (can(key)) return true;
      notifyInsufficientPrivilege(kind);
      return false;
    };

    const requireCanAny = (
      keys: string[],
      kind: PrivilegeDenialKind = "action",
    ): boolean => {
      if (keys.length === 0 || canAny(...keys)) return true;
      notifyInsufficientPrivilege(kind);
      return false;
    };

    return {
      can,
      canAny,
      canAll: (...keys: string[]) => keys.every((k) => can(k)),
      requireCan,
      requireCanAny,
      isVag,
      isFullAccess,
      hasRolePermissions,
      role,
      permissions,
    };
  }, [role, permissions, locked, roleName]);
}

/** @deprecated Use useAppPermissions — same entity-agnostic API. */
export function useHq6Permissions(): AppPermissionsApi {
  return useAppPermissions();
}
