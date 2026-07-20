"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshAccessToken } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { decodeAccessToken } from "@/lib/utils/jwt";
import { isAuthSkipped } from "@/lib/utils/devAccess";
import { PageShellSkeleton } from "@/components/organisms/skeletons";

const PUBLIC_PREFIXES = ["/login", "/reset-password", "/invite"];
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
  const role = useAuthStore((state) => state.role);
  const tenantId = useAuthStore((state) => state.tenantId);

  useEffect(() => {
    if (skipAuth) return;
    if (!hydrated) return;

    const state = useAuthStore.getState();
    if (state.token) {
      const decoded = decodeAccessToken(state.token);
      const expiresSoon =
        decoded?.exp != null && decoded.exp * 1000 < Date.now() + 2 * 60 * 1000;
      if (!decoded || expiresSoon) {
        void refreshAccessToken().then((result) => {
          if (!result) {
            if (!decoded) state.clearAuth();
            return;
          }
          state.setAuth({
            userId: result.user.id,
            email: result.user.email,
            name: result.user.name,
            tenantId: result.user.tenantId,
            role: result.user.role,
            token: result.accessToken,
          });
        });
      }
    }

    if (isPublicPath(pathname)) {
      if (isAuthenticated && pathname === "/login") {
        router.replace(getPostLoginPath(role!, tenantId));
      }
      return;
    }

    if (!isAuthenticated) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [hydrated, isAuthenticated, pathname, role, tenantId, router]);

  if (skipAuth) {
    return <>{children}</>;
  }

  // Public auth pages need no API data — never flash the app shell skeleton.
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  if (!hydrated) {
    return <PageShellSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
