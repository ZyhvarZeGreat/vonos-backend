"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import {
  confirmTwoFactor,
  disableTwoFactor,
  setupTwoFactor,
} from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";

export function SecuritySettingsPanel() {
  const role = useAuthStore((state) => state.role);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canManage2fa = role === "admin" || role === "super_admin";

  if (!canManage2fa) {
    return (
      <p className="text-sm text-muted">
        Two-factor authentication is only required for Admin and Super Admin roles.
      </p>
    );
  }

  async function handleSetup() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const result = await setupTwoFactor();
      setSetupSecret(result.secret);
      setOtpauthUrl(result.otpauthUrl);
      setMessage("Scan the OTP URI in your authenticator app, then enter a code to confirm.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await confirmTwoFactor(confirmCode.trim());
      setEnabled(true);
      setSetupSecret(null);
      setOtpauthUrl(null);
      setConfirmCode("");
      setMessage("Two-factor authentication is now enabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await disableTwoFactor(disableCode.trim());
      setEnabled(false);
      setDisableCode("");
      setMessage("Two-factor authentication has been disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to disable 2FA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Two-factor authentication</h2>
        <p className="mt-1 text-sm text-muted">
          Required for Admin and Super Admin sign-in once enabled. Use Google Authenticator,
          1Password, or any TOTP app.
        </p>
      </div>

      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}

      {!enabled && !setupSecret ? (
        <Button type="button" onClick={handleSetup} disabled={loading}>
          {loading ? "Starting…" : "Set up 2FA"}
        </Button>
      ) : null}

      {setupSecret ? (
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="rounded-lg bg-[var(--color-surface-muted)] p-3 text-xs break-all text-muted">
            <p className="font-medium text-foreground">Manual secret</p>
            <p className="mt-1 font-mono">{setupSecret}</p>
            {otpauthUrl ? (
              <>
                <p className="mt-3 font-medium text-foreground">OTP URI</p>
                <p className="mt-1">{otpauthUrl}</p>
              </>
            ) : null}
          </div>
          <Input
            label="Confirm with 6-digit code"
            inputMode="numeric"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading || confirmCode.length < 6}>
            Enable 2FA
          </Button>
        </form>
      ) : null}

      {enabled ? (
        <form onSubmit={handleDisable} className="space-y-4">
          <p className="text-sm text-muted">2FA is enabled on this account.</p>
          <Input
            label="Current 6-digit code to disable"
            inputMode="numeric"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            required
          />
          <Button type="submit" variant="secondary" disabled={loading || disableCode.length < 6}>
            Disable 2FA
          </Button>
        </form>
      ) : null}
    </div>
  );
}
