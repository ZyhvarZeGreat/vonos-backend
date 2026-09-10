import type {
  ForgotPasswordResponse,
  InviteDetails,
  LoginResponse,
  LoginSuccessResponse,
  LoginUser,
  SessionDebugResponse,
  TwoFactorSetupResponse,
} from "@vonos/types";
import { apiUrl } from "@/lib/api/client";
import { throwApiError } from "@/lib/api/parseApiError";

export type {
  InviteDetails,
  LoginResponse,
  LoginSuccessResponse,
  LoginUser,
  SessionDebugResponse,
};

const jsonHeaders = { "Content-Type": "application/json" };

function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      ...jsonHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

export function isTwoFactorChallenge(
  response: LoginResponse,
): response is Extract<LoginResponse, { requiresTwoFactor: true }> {
  return "requiresTwoFactor" in response && response.requiresTwoFactor === true;
}

export async function login(
  emailOrUsername: string,
  password: string,
): Promise<LoginResponse> {
  const response = await authFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: emailOrUsername, password }),
  });
  if (!response.ok) {
    return throwApiError(response, "Invalid email/username or password");
  }
  return response.json() as Promise<LoginResponse>;
}

export async function verifyTwoFactor(
  challengeToken: string,
  code: string,
): Promise<LoginSuccessResponse> {
  const response = await authFetch("/auth/verify-2fa", {
    method: "POST",
    body: JSON.stringify({ challengeToken, code }),
  });
  if (!response.ok) {
    return throwApiError(response, "Invalid authentication code");
  }
  return response.json() as Promise<LoginSuccessResponse>;
}

export async function refreshAccessToken(): Promise<LoginSuccessResponse | null> {
  // Share single-flight with apiFetch so soft-refresh + 401 retry cannot
  // race against each other.
  const { refreshSessionOnce } = await import("@/lib/api/client");
  return refreshSessionOnce();
}

/** Sync LoginUser / permissions via Bearer — does not touch refresh cookie. */
export async function getSessionProfile(): Promise<LoginUser> {
  const { apiFetch } = await import("@/lib/api/client");
  const { useAuthStore } = await import("@/stores/authStore");
  const tenantId = useAuthStore.getState().tenantId;
  const path = tenantId
    ? `/auth/me?tenantId=${encodeURIComponent(tenantId)}`
    : "/auth/me";
  const response = await apiFetch(path);
  if (!response.ok) {
    return throwApiError(response, "Unable to load session");
  }
  return response.json() as Promise<LoginUser>;
}

/** Read-only session probe — does not rotate tokens. Use while logged in. */
export async function getSessionDebug(): Promise<SessionDebugResponse> {
  const { apiUrl } = await import("@/lib/api/client");
  const { useAuthStore } = await import("@/stores/authStore");
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(apiUrl("/auth/session-debug"), {
    method: "GET",
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    return throwApiError(response, "Unable to load session debug");
  }
  return response.json() as Promise<SessionDebugResponse>;
}

export async function switchWorkingTenant(
  tenantCode: string,
): Promise<LoginSuccessResponse> {
  const { apiFetch } = await import("@/lib/api/client");
  const response = await apiFetch("/auth/switch-tenant", {
    method: "POST",
    body: JSON.stringify({ tenantCode }),
  });
  if (!response.ok) {
    return throwApiError(response, "Unable to switch location");
  }
  return response.json() as Promise<LoginSuccessResponse>;
}

export async function logout(): Promise<void> {
  await authFetch("/auth/logout", { method: "POST" });
}

export async function requestPasswordReset(
  email: string,
): Promise<ForgotPasswordResponse> {
  const response = await authFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error("Unable to send reset email");
  return response.json() as Promise<ForgotPasswordResponse>;
}

export async function validateResetToken(token: string): Promise<{ email: string }> {
  const response = await authFetch(`/auth/reset-password/${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error("Reset link is invalid or expired");
  return response.json() as Promise<{ email: string }>;
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const response = await authFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  if (!response.ok) {
    return throwApiError(response, "Unable to reset password");
  }
}

export async function getInvite(token: string): Promise<InviteDetails> {
  const response = await authFetch(`/auth/invite/${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error("Invite link is invalid or expired");
  return response.json() as Promise<InviteDetails>;
}

export async function acceptInvite(
  token: string,
  password: string,
  name?: string,
): Promise<LoginSuccessResponse> {
  const response = await authFetch("/auth/invite/accept", {
    method: "POST",
    body: JSON.stringify({ token, password, name }),
  });
  if (!response.ok) {
    return throwApiError(response, "Unable to accept invite");
  }
  return response.json() as Promise<LoginSuccessResponse>;
}

export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  const { apiFetch } = await import("@/lib/api/client");
  const response = await apiFetch("/auth/2fa/setup", { method: "POST" });
  if (!response.ok) {
    return throwApiError(response, "Unable to start 2FA setup");
  }
  return response.json() as Promise<TwoFactorSetupResponse>;
}

export async function confirmTwoFactor(code: string): Promise<void> {
  const { apiFetch } = await import("@/lib/api/client");
  const response = await apiFetch("/auth/2fa/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    return throwApiError(response, "Invalid code");
  }
}

export async function disableTwoFactor(code: string): Promise<void> {
  const { apiFetch } = await import("@/lib/api/client");
  const response = await apiFetch("/auth/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    return throwApiError(response, "Unable to disable 2FA");
  }
}
