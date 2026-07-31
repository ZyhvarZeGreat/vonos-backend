"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { AuthFooterLink, AuthTemplate } from "@/components/templates/AuthTemplate";
import { resetPassword, validateResetToken } from "@/lib/api/auth";
import { PasswordField } from "@/components/atoms/PasswordField";
import { parseForm } from "@/lib/validation/parseForm";
import { resetPasswordFormSchema } from "@/lib/validation/schemas";

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
    const valid = parseForm(
      resetPasswordFormSchema,
      { password, confirmPassword: confirm },
      { setError },
    );
    if (!valid) return;
    setError(null);
    setLoading(true);
    try {
      await resetPassword(params.token, valid.password);
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
          <PasswordField
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showStrength
            required
          />
          <PasswordField
            label="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
