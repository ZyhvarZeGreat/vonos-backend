"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshAccessToken } from "@/lib/api/auth";
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
/** Re-pull TenantRole permissions often enough that role matrix edits apply without a full re-login. */
const PERMISSIONS_REFRESH_MS = 45_000;
let lastPermissionsRefreshAt = 0;

function applyRefreshResult(
  result: NonNullable<Awaited<ReturnType<typeof refreshAccessToken>>>,
): void {
  useAuthStore.getState().setAuth({
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
    tenantId: result.user.tenantId,
    role: result.user.role,
    token: result.accessToken,
    tenantRoleId: result.user.tenantRoleId ?? null,
    tenantRoleName: result.user.tenantRoleName ?? null,
    tenantRolePermissions: result.user.tenantRolePermissions ?? [],
    tenantRoleLocked: result.user.tenantRoleLocked ?? false,
    allowedTenantCodes: result.user.allowedTenantCodes ?? [],
  });
}

function softRefreshSession(force = false): void {
  const state = useAuthStore.getState();
  if (!state.token || !state.isAuthenticated) return;
  const now = Date.now();
  if (!force && now - lastPermissionsRefreshAt < PERMISSIONS_REFRESH_MS) {
    return;
  }
  lastPermissionsRefreshAt = now;
  void refreshAccessToken()
    .then((result) => {
      if (!result) {
        if (!decodeAccessToken(useAuthStore.getState().token ?? "")) {
          useAuthStore.getState().clearAuth();
        }
        return;
      }
      applyRefreshResult(result);
    })
    .catch(() => {
      if (!decodeAccessToken(useAuthStore.getState().token ?? "")) {
        useAuthStore.getState().clearAuth();
      }
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
      const decoded = decodeAccessToken(state.token);
      const expiresSoon =
        decoded?.exp != null && decoded.exp * 1000 < Date.now() + 2 * 60 * 1000;
      if (!decoded || expiresSoon) {
        softRefreshSession(true);
      } else if (state.isAuthenticated && !isPublicPath(pathname)) {
        // Keep permission keys in sync after Roles page edits.
        softRefreshSession(false);
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
    const onFocus = () => softRefreshSession(false);
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
