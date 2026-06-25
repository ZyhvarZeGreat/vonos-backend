"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AuthFooterLink, AuthTemplate } from "@/components/templates/AuthTemplate";
import { requestPasswordReset } from "@/lib/api/auth";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      setDevResetUrl(result.devResetUrl ?? null);
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
          {devResetUrl ? (
            <p>
              Dev reset link:{" "}
              <Link href={devResetUrl.replace(/^https?:\/\/[^/]+/, "")} className="underline">
                open reset page
              </Link>
            </p>
          ) : null}
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
