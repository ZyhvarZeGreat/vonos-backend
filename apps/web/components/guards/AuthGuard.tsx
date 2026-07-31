"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshAccessToken } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { decodeAccessToken } from "@/lib/utils/jwt";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { isAuthSkipped } from "@/lib/utils/devAccess";

const PUBLIC_PREFIXES = ["/login", "/reset-password", "/invite", "/invoice"];
const skipAuth = isAuthSkipped();

function isPublicPath(pathname: string): boolean {
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
        void refreshAccessToken()
          .then((result) => {
            if (!result) {
              // Only wipe session when the access token is already unusable.
              if (!decodeAccessToken(useAuthStore.getState().token ?? "")) {
                useAuthStore.getState().clearAuth();
              }
              return;
            }
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
          })
          .catch(() => {
            if (!decodeAccessToken(useAuthStore.getState().token ?? "")) {
              useAuthStore.getState().clearAuth();
            }
          });
      }
    }

    if (pathname === "/login" && state.isAuthenticated && state.role) {
      router.replace(getPostLoginPath(state.role, state.tenantId));
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
