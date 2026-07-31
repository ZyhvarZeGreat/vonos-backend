"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AuthFooterLink, AuthTemplate } from "@/components/templates/AuthTemplate";
import { requestPasswordReset } from "@/lib/api/auth";
import { parseForm } from "@/lib/validation/parseForm";
import { requestResetEmailSchema } from "@/lib/validation/schemas";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const valid = parseForm(
      requestResetEmailSchema,
      { email },
      { setError },
    );
    if (!valid) return;
    setError(null);
    setLoading(true);
    try {
      const result = await requestPasswordReset(valid.email);
      void result;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthTemplate
      title="Reset password"
      subtitle="We will email a reset link if the account exists"
      footer={
        <>
          Remembered it? <AuthFooterLink href="/login">Back to sign in</AuthFooterLink>
        </>
      }
    >
      {sent ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm text-muted">
          <p>
            If an account exists for <strong className="text-foreground">{email}</strong>, a reset
            link is on its way.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthTemplate>
  );
}
