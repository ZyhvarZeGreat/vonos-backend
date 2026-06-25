"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AuthFooterLink, AuthTemplate } from "@/components/templates/AuthTemplate";
import { resetPassword, validateResetToken } from "@/lib/api/auth";

export default function ResetPasswordConfirmPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void validateResetToken(params.token)
      .then((result) => setEmail(result.email))
      .catch(() => setError("This reset link is invalid or expired"));
  }, [params.token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(params.token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthTemplate
      title="Choose a new password"
      subtitle={email ? `Resetting access for ${email}` : "Set a new password for your account"}
      footer={
        <>
          <AuthFooterLink href="/login">Back to sign in</AuthFooterLink>
        </>
      }
    >
      {error && !email ? (
        <div className="rounded-xl border border-error/30 bg-error-bg p-4 text-sm text-error">
          {error}
          <div className="mt-4">
            <Link href="/reset-password" className="font-medium underline">
              Request a new link
            </Link>
          </div>
        </div>
      ) : done ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
          Password updated. Redirecting to sign in…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          {error && email ? <p className="text-sm text-error">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? "Saving…" : "Update password"}
          </Button>
        </form>
      )}
    </AuthTemplate>
  );
}
