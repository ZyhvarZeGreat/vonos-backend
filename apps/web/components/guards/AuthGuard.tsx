"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSessionProfile, refreshAccessToken } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { decodeAccessToken } from "@/lib/utils/jwt";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { isAuthSkipped } from "@/lib/utils/devAccess";

const PUBLIC_PREFIXES = [
  "/login",
  "/reset-password",
  "/invite",
  "/invoice",
  // Customer marketing site (apex)
  "/about",
  "/services",
  "/shop",
  "/track",
  "/contact",
  "/maintenance",
];
const skipAuth = isAuthSkipped();
/** Pull TenantRole permissions via /auth/me (no refresh-cookie touch). */
const PERMISSIONS_SYNC_MS = 15 * 60_000;
/** Only hit /auth/refresh when access JWT is this close to expiring. */
const ACCESS_REFRESH_SKEW_MS = 5 * 60_000;
let lastPermissionsSyncAt = 0;
let lastAccessRefreshAt = 0;

function applySessionUser(
  user: Awaited<ReturnType<typeof getSessionProfile>>,
  accessToken?: string,
): void {
  const state = useAuthStore.getState();
  useAuthStore.getState().setAuth({
    userId: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    role: user.role,
    token: accessToken ?? state.token ?? "",
    tenantRoleId: user.tenantRoleId ?? null,
    tenantRoleName: user.tenantRoleName ?? null,
    tenantRolePermissions: user.tenantRolePermissions ?? [],
    tenantRoleLocked: user.tenantRoleLocked ?? false,
    allowedTenantCodes: user.allowedTenantCodes ?? [],
  });
}

/** Refresh access JWT only when near expiry — does not run on every navigation. */
function refreshAccessIfNeeded(force = false): void {
  const state = useAuthStore.getState();
  if (!state.token || !state.isAuthenticated) return;

  const decoded = decodeAccessToken(state.token);
  const expiresSoon =
    !decoded ||
    (decoded.exp != null && decoded.exp * 1000 < Date.now() + ACCESS_REFRESH_SKEW_MS);

  if (!force && !expiresSoon) return;

  const now = Date.now();
  if (!force && now - lastAccessRefreshAt < 30_000) return;
  lastAccessRefreshAt = now;

  void refreshAccessToken()
    .then((result) => {
      if (!result) {
        if (!decodeAccessToken(useAuthStore.getState().token ?? "")) {
          useAuthStore.getState().clearAuth();
        }
        return;
      }
      applySessionUser(result.user, result.accessToken);
    })
    .catch(() => {
      if (!decodeAccessToken(useAuthStore.getState().token ?? "")) {
        useAuthStore.getState().clearAuth();
      }
    });
}

/** Sync permissions without touching the refresh cookie. */
function syncPermissionsIfNeeded(force = false): void {
  const state = useAuthStore.getState();
  if (!state.token || !state.isAuthenticated) return;
  if (!decodeAccessToken(state.token)) return;

  const now = Date.now();
  if (!force && now - lastPermissionsSyncAt < PERMISSIONS_SYNC_MS) return;
  lastPermissionsSyncAt = now;

  void getSessionProfile()
    .then((user) => applySessionUser(user))
    .catch(() => {
      /* ignore — access refresh / apiFetch 401 path handles real expiry */
    });
}

function isPublicPath(pathname: string): boolean {
  // Apex maintenance / brand landing — must stay reachable without login.
  if (pathname === "/" || pathname === "") return true;
  if (pathname.startsWith("/dev")) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (skipAuth) return;
    if (!hydrated) return;

    const state = useAuthStore.getState();
    if (state.token) {
      refreshAccessIfNeeded(false);
      if (state.isAuthenticated && !isPublicPath(pathname)) {
        syncPermissionsIfNeeded(false);
      }
    }

    if (pathname === "/login" && state.isAuthenticated && state.role) {
      router.replace(
        getPostLoginPath(state.role, state.tenantId, state.tenantRoleName),
      );
      return;
    }

    if (isPublicPath(pathname)) {
      return;
    }

    if (!state.isAuthenticated) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (skipAuth || !hydrated || !isAuthenticated) return;
    const onFocus = () => {
      refreshAccessIfNeeded(false);
      syncPermissionsIfNeeded(false);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hydrated, isAuthenticated]);
  if (skipAuth) {
    return <>{children}</>;
  }

  // Public auth pages need no API data — show UI immediately (no spinner/skeleton).
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  // Wait for persist hydrate without a fake app-shell skeleton.
  if (!hydrated) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading"
        style={{
          minHeight: "100vh",
          background: "#f3f4f6",
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        aria-busy="true"
        aria-label="Redirecting to login"
        style={{ minHeight: "100vh", background: "#0b5ed7" }}
      />
    );
  }

  return <>{children}</>;
}
