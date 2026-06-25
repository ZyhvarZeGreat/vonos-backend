"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AuthFooterLink, AuthTemplate } from "@/components/templates/AuthTemplate";
import { isTwoFactorChallenge, login, verifyTwoFactor } from "@/lib/api/auth";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import type { Role } from "@vonos/types";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";

const DEMO_ACCOUNTS = [
  {
    email: "admin@vonos.test",
    password: "password",
    name: "Warehouse Admin",
    role: "admin" as Role,
  },
  {
    email: "admin@vag.vonos",
    password: "demo123",
    name: "VAG Super Admin",
    role: "super_admin" as Role,
  },
];

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

  async function signInWithCredential(credential: (typeof DEMO_ACCOUNTS)[number]) {
    setError(null);
    setLoading(true);
    try {
      const result = await login(credential.email, credential.password);
      if (isTwoFactorChallenge(result)) {
        setChallengeToken(result.challengeToken);
        setChallengeEmail(result.user.email);
        setEmail(credential.email);
        setPassword(credential.password);
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

  function fillDemo(credential: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(credential.email);
    setPassword(credential.password);
    setChallengeToken(null);
    setChallengeEmail(null);
    setTotpCode("");
    setError(null);
  }

  const warehouseCredential = DEMO_ACCOUNTS.find((c) => c.role === "admin")!;

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
          <>
            <button
              type="button"
              className="text-sm text-muted underline"
              onClick={() => {
                setChallengeToken(null);
                setChallengeEmail(null);
                setTotpCode("");
                setError(null);
              }}
            >
              Back to sign in
            </button>
          </>
        }
      >
        <form onSubmit={handleVerifyTotp} className="space-y-4">
          <Input
            label="Authentication code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="000000"
            required
          />
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || totpCode.length < 6}>
            {loading ? "Verifying…" : "Verify and continue"}
          </Button>
        </form>
      </AuthTemplate>
    );
  }

  return (
    <AuthTemplate
      title="Sign in"
      subtitle="Use your Vonos invite credentials"
      footer={
        <>
          No account?{" "}
          <AuthFooterLink href="/reset-password">Reset password</AuthFooterLink>
        </>
      }
    >
      <Button
        type="button"
        className="w-full"
        disabled={loading}
        onClick={() => signInWithCredential(warehouseCredential)}
      >
        {loading ? "Signing in…" : "Enter Vonos Warehouse"}
      </Button>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Demo accounts</p>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((credential) => (
            <button
              key={credential.email}
              type="button"
              onClick={() => fillDemo(credential)}
              className="rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-muted)]"
            >
              <span className="font-medium text-foreground">{credential.name}</span>
              <span className="mt-0.5 block text-muted">
                {credential.email} ·{" "}
                {credential.role === "super_admin" ? "Group admin" : "Warehouse"}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Warehouse: password · VAG super admin: demo123
        </p>
      </div>
    </AuthTemplate>
  );
}
