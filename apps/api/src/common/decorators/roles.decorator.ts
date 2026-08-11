import { SetMetadata } from '@nestjs/common';
import type { Role } from '@vonos/types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthenticatedUser {
  sub: string;
  tenantId: string | null;
  role: Role;
  /**
   * HQ6 / permission-matrix keys attached for permission-based guards.
   * Present when the auth layer resolves TenantRole permissions (cached).
   */
  tenantRolePermissions?: string[] | null;
}
