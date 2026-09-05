import type { Role, UserStatus } from "./role";

export interface User {
  id: string;
  email: string;
  /** Login handle when set; login accepts email or username. */
  username?: string | null;
  name: string;
  role: Role;
  status: UserStatus;
  tenantId: string | null;
  /** HQ6 job role id when assigned. */
  tenantRoleId?: string | null;
  /** Display name of the assigned TenantRole. */
  tenantRoleName?: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export type JwtTokenType = "access" | "2fa_challenge";

export interface JwtPayload {
  sub: string;
  tenantId: string | null;
  role: Role;
  tokenVersion: number;
  type: JwtTokenType;
}

export interface LoginUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
  tenantRoleId?: string | null;
  tenantRoleName?: string | null;
  tenantRolePermissions?: string[];
  tenantRoleLocked?: boolean;
  /**
   * Entity codes this user may work in (from admin work-location clearance).
   * When length > 1, the header shows a location switcher.
   */
  allowedTenantCodes?: string[];
}

export interface LoginSuccessResponse {
  accessToken: string;
  user: LoginUser;
}

export interface TwoFactorChallengeResponse {
  requiresTwoFactor: true;
  challengeToken: string;
  user: Pick<LoginUser, "id" | "email" | "name">;
}

export type LoginResponse = LoginSuccessResponse | TwoFactorChallengeResponse;

export interface ForgotPasswordResponse {
  success: true;
  devResetUrl?: string;
}

export interface InviteDetails {
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
  tenantName: string | null;
}

export interface InviteUserRequest {
  email: string;
  name: string;
  role: Role;
  /** HQ6 job role — when set, JWT `role` is derived from its permissions. */
  tenantRoleId?: string | null;
  /** Required for super_admin when not viewing a specific entity. Omit for tenant admins. */
  tenantId?: string | null;
}

export interface InviteUserResponse {
  user: User;
  /** Dev-only invite URL when NODE_ENV is not production */
  devInviteUrl?: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: Role;
  password: string;
  /** Optional login username (unique). Defaults to email local-part when omitted. */
  username?: string | null;
  /** HQ6 job role — when set, JWT `role` is derived from its permissions. */
  tenantRoleId?: string | null;
  /** Required for super_admin when not viewing a specific entity. Omit for tenant admins. */
  tenantId?: string | null;
}

export interface CreateUserResponse {
  user: User;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: Role;
  username?: string | null;
  tenantRoleId?: string | null;
  status?: UserStatus;
  /** Optional — when set, must be at least 8 characters. */
  password?: string;
}

export interface UpdateUserResponse {
  user: User;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
}
