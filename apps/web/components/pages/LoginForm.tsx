"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AuthTemplate } from "@/components/templates/AuthTemplate";
import { isTwoFactorChallenge, login, verifyTwoFactor } from "@/lib/api/auth";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";

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
          <Button type="submit" className="w-full" isLoading={loading} disabled={totpCode.length < 6}>
            Verify and continue
          </Button>
        </form>
      </AuthTemplate>
    );
  }

  return (
    <AuthTemplate
      title="Sign in"
      subtitle="Use the email and password from your invitation"
    >
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
        <Button type="submit" className="w-full" isLoading={loading}>
          Sign in
        </Button>
      </form>
    </AuthTemplate>
  );
}
