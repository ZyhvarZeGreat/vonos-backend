"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AuthFooterLink, AuthTemplate } from "@/components/templates/AuthTemplate";
import { acceptInvite, getInvite } from "@/lib/api/auth";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { useAuthStore } from "@/stores/authStore";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getInvite(params.token)
      .then((invite) => {
        setInviteEmail(invite.email);
        setName(invite.name);
        setTenantName(invite.tenantName);
      })
      .catch(() => setError("This invite link is invalid or expired"));
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
      const result = await acceptInvite(params.token, password, name);
      setAuth({
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        tenantId: result.user.tenantId,
        role: result.user.role,
        token: result.accessToken,
      });
      router.replace(getPostLoginPath(result.user.role, result.user.tenantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthTemplate
      title="Accept invite"
      subtitle={
        tenantName
          ? `Join ${tenantName} on Vonos`
          : inviteEmail
            ? `Set up access for ${inviteEmail}`
            : "Set your password to activate your account"
      }
      footer={
        <>
          Already active? <AuthFooterLink href="/login">Sign in</AuthFooterLink>
        </>
      }
    >
      {error && !inviteEmail ? (
        <div className="rounded-xl border border-error/30 bg-error-bg p-4 text-sm text-error">
          {error}
          <div className="mt-4">
            <Link href="/login" className="font-medium underline">
              Go to login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" value={inviteEmail ?? ""} disabled />
          <Input
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Password"
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
          {error && inviteEmail ? <p className="text-sm text-error">{error}</p> : null}
          <Button type="submit" className="w-full" isLoading={loading} disabled={!inviteEmail}>
            Activate account
          </Button>
        </form>
      )}
    </AuthTemplate>
  );
}
