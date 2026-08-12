"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { PasswordField } from "@/components/atoms/PasswordField";
import { AuthFooterLink, AuthTemplate } from "@/components/templates/AuthTemplate";
import { isTwoFactorChallenge, login, verifyTwoFactor } from "@/lib/api/auth";
import { warmPostLoginDestination } from "@/lib/prefetch/warmPostLogin";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { validateUsername } from "@/lib/utils/formValidation";
import { welcomeFirstName } from "@/lib/utils/welcomeFirstName";
import { preloadUposStylesheets } from "@/lib/upos/styles";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";

const authFieldClass =
  "box-border block h-12 w-full rounded-lg border border-[var(--auth-blue,#1d4ed8)]/15 bg-[var(--auth-blue-soft,#eff6ff)] px-4 pr-11 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:ring-2 focus:ring-[var(--auth-blue,#1d4ed8)]/30";

const authSubmitClass =
  "h-12 w-full gap-2 rounded-full bg-[var(--auth-red,#dc2626)] text-base font-semibold text-white shadow-md shadow-[var(--auth-red,#dc2626)]/25 hover:bg-[var(--auth-red-hover,#b91c1c)] border-0 disabled:opacity-60";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const tenantId = useAuthStore((state) => state.tenantId);
  const [, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeEmail, setChallengeEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    preloadUposStylesheets();
  }, []);

  // Already signed in (bookmark / back) — leave login without waiting on AuthGuard.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !role) return;
    const tenantRoleName = useAuthStore.getState().tenantRoleName;
    const redirect = searchParams.get("redirect");
    const requested =
      redirect && redirect.startsWith("/") && !redirect.startsWith("/login")
        ? redirect
        : getPostLoginPath(role, tenantId, tenantRoleName);
    const destination = warmPostLoginDestination(queryClient, {
      role,
      tenantId,
      tenantRoleName,
      destination: requested,
    });
    router.prefetch(destination);
    startTransition(() => {
      router.replace(destination);
    });
  }, [
    hydrated,
    isAuthenticated,
    role,
    tenantId,
    queryClient,
    router,
    searchParams,
    startTransition,
  ]);

  function completeLogin(result: import("@vonos/types").LoginSuccessResponse) {
    setAuth({
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
    const redirect = searchParams.get("redirect");
    const requested =
      redirect && redirect.startsWith("/") && !redirect.startsWith("/login")
        ? redirect
        : getPostLoginPath(
            result.user.role,
            result.user.tenantId,
            result.user.tenantRoleName,
          );

    const destination = warmPostLoginDestination(queryClient, {
      role: result.user.role,
      tenantId: result.user.tenantId,
      tenantRoleName: result.user.tenantRoleName,
      destination: requested,
    });

    router.prefetch(destination);
    startTransition(() => {
      router.replace(destination);
    });
    toast.success(`Welcome back, ${welcomeFirstName(result.user.name)}`);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!hydrated) {
      const message = "Still loading session — try again in a moment.";
      setError(message);
      toast.error(message);
      return;
    }
    const loginIdError = validateUsername(email, { required: true });
    if (loginIdError) {
      setError(loginIdError);
      toast.error(loginIdError);
      return;
    }
    if (!password) {
      const message = "Password is required.";
      setError(message);
      toast.error(message);
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (isTwoFactorChallenge(result)) {
        setChallengeToken(result.challengeToken);
        setChallengeEmail(result.user.email);
        return;
      }
      completeLogin(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyTotp(event: React.FormEvent) {
    event.preventDefault();
    if (!challengeToken) return;
    setError(null);
    setLoading(true);
    try {
      const result = await verifyTwoFactor(challengeToken, totpCode.trim());
      completeLogin(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (challengeToken) {
    return (
      <AuthTemplate
        title="Two-factor authentication"
        subtitle={
          challengeEmail
            ? `Enter the 6-digit code from your authenticator app for ${challengeEmail}`
            : "Enter the 6-digit code from your authenticator app"
        }
        footer={
          <button
            type="button"
            className="text-sm font-medium text-[var(--auth-blue,#1d4ed8)] underline-offset-4 hover:underline"
            onClick={() => {
              setChallengeToken(null);
              setChallengeEmail(null);
              setTotpCode("");
              setError(null);
            }}
          >
            Back to sign in
          </button>
        }
      >
        <form onSubmit={handleVerifyTotp} className="space-y-5">
          <Input
            label="AUTHENTICATION CODE"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="000000"
            required
            className={authFieldClass}
          />
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <Button
            type="submit"
            className={authSubmitClass}
            isLoading={loading}
            loadingText="Verifying…"
            disabled={totpCode.length < 6}
          >
            Verify and continue
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Button>
        </form>
      </AuthTemplate>
    );
  }

  return (
    <AuthTemplate
      title="Dashboard Log In"
      subtitle="Sign in with your email or username and password"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <Input
            label="EMAIL OR USERNAME"
            type="text"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com or username"
            required
            className={authFieldClass}
          />
          <Mail
            className="pointer-events-none absolute right-3.5 bottom-3 h-4 w-4 text-[var(--auth-blue,#1d4ed8)]/70"
            aria-hidden
          />
        </div>
        <PasswordField
          id="login_password"
          label="PASSWORD"
          inputClassName={authFieldClass}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          required
        />
        <div className="flex justify-end">
          <AuthFooterLink href="/reset-password">Forgot Password?</AuthFooterLink>
        </div>
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <Button
          type="submit"
          className={authSubmitClass}
          isLoading={loading}
          loadingText="Signing in…"
          disabled={!hydrated || loading}
        >
          Log In
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Button>
      </form>
    </AuthTemplate>
  );
}
