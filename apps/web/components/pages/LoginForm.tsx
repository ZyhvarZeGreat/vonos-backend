"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AuthFooterLink, AuthTemplate } from "@/components/templates/AuthTemplate";
import { Spinner } from "@/components/atoms/Spinner";
import { isTwoFactorChallenge, login, verifyTwoFactor } from "@/lib/api/auth";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";

const authFieldClass =
  "h-12 rounded-lg border-0 bg-[var(--auth-blue-soft,#e8f1fb)] px-4 pr-11 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:ring-2 focus:ring-[var(--auth-blue,#0b5ed7)]/25";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeEmail, setChallengeEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function completeLogin(result: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      tenantId: string | null;
      role: import("@vonos/types").Role;
    };
  }) {
    setAuth({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      tenantId: result.user.tenantId,
      role: result.user.role,
      token: result.accessToken,
    });
    const redirect = searchParams.get("redirect");
    const destination =
      redirect && redirect.startsWith("/") && !redirect.startsWith("/login")
        ? redirect
        : getPostLoginPath(result.user.role, result.user.tenantId);
    router.replace(destination);
    toast.success(`Welcome back, ${result.user.name}`);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
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
            className="text-sm font-medium text-[var(--auth-blue,#0b5ed7)] underline-offset-4 hover:underline"
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
        <form onSubmit={handleVerifyTotp} className="relative space-y-5">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/70 backdrop-blur-[1px]">
              <Spinner size="lg" className="text-[var(--auth-blue,#0b5ed7)]" />
            </div>
          ) : null}
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
            className="h-12 w-full rounded-lg text-base"
            isLoading={loading}
            disabled={totpCode.length < 6}
          >
            Verify and continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </AuthTemplate>
    );
  }

  return (
    <AuthTemplate title="Dashboard Log In" subtitle="Use the email and password from your invitation">
      <form onSubmit={handleSubmit} className="relative space-y-5">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/70 backdrop-blur-[1px]">
            <Spinner size="lg" className="text-[var(--auth-blue,#0b5ed7)]" />
          </div>
        ) : null}
        <div className="relative">
          <Input
            label="EMAIL ADDRESS"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className={authFieldClass}
          />
          <Mail
            className="pointer-events-none absolute right-3.5 bottom-3 h-4 w-4 text-[var(--auth-blue,#0b5ed7)]/70"
            aria-hidden
          />
        </div>
        <div className="relative">
          <Input
            label="PASSWORD"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            required
            className={authFieldClass}
          />
          <Lock
            className="pointer-events-none absolute right-3.5 bottom-3 h-4 w-4 text-[var(--auth-blue,#0b5ed7)]/70"
            aria-hidden
          />
        </div>
        <div className="flex justify-end">
          <AuthFooterLink href="/reset-password">Forgot Password?</AuthFooterLink>
        </div>
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <Button type="submit" className="h-12 w-full rounded-lg text-base" isLoading={loading}>
          Log In
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthTemplate>
  );
}
