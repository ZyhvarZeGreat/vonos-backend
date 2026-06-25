"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import type { Role } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { Select } from "@/components/atoms/Select";
import { createUser, inviteUser } from "@/lib/api/users";
import { ENTITY_LIST } from "@/lib/registries/tenants";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/authStore";

const VAG_ENTITY_VALUE = "__vag__";

type AddUserMode = "invite" | "direct";

export interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  /** Group admin view — pick any entity (or VAG for super admin). */
  allTenants?: boolean;
  defaultTenantId?: string | null;
}

function formatRole(role: Role): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function InviteUserModal({
  open,
  onClose,
  allTenants = false,
  defaultTenantId,
}: InviteUserModalProps) {
  const queryClient = useQueryClient();
  const actorRole = useAuthStore((state) => state.role);
  const isSuperAdmin = actorRole === "super_admin";

  const [mode, setMode] = useState<AddUserMode>("invite");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [entityValue, setEntityValue] = useState(
    defaultTenantId ?? (allTenants ? "" : defaultTenantId ?? ""),
  );
  const [role, setRole] = useState<Role>(isSuperAdmin ? "manager" : "staff");
  const [devInviteUrl, setDevInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entityOptions = useMemo(() => {
    const options = [{ value: "", label: "Select entity…" }];
    if (allTenants && isSuperAdmin) {
      options.push({ value: VAG_ENTITY_VALUE, label: "Vonos Autos Group (VAG)" });
    }
    for (const entity of ENTITY_LIST) {
      options.push({
        value: entity.tenantId,
        label: `${entity.name} (${entity.code})`,
      });
    }
    return options;
  }, [allTenants, isSuperAdmin]);

  const roleOptions = useMemo(() => {
    if (entityValue === VAG_ENTITY_VALUE) {
      return [{ value: "super_admin", label: formatRole("super_admin") }];
    }
    if (isSuperAdmin) {
      return (["admin", "manager", "staff", "viewer"] as const).map((r) => ({
        value: r,
        label: formatRole(r),
      }));
    }
    return (["manager", "staff", "viewer"] as const).map((r) => ({
      value: r,
      label: formatRole(r),
    }));
  }, [entityValue, isSuperAdmin]);

  const resolvedTenantId = useMemo(() => {
    if (!allTenants) return defaultTenantId ?? null;
    if (entityValue === VAG_ENTITY_VALUE) return null;
    return entityValue || null;
  }, [allTenants, defaultTenantId, entityValue]);

  const resolvedRole =
    entityValue === VAG_ENTITY_VALUE ? ("super_admin" as const) : role;

  const basePayload = {
    email,
    name,
    role: resolvedRole,
    tenantId: allTenants ? resolvedTenantId : undefined,
  };

  const inviteMutation = useAppMutation({
    mutationFn: () =>
      inviteUser(basePayload, {
        tenantId: allTenants ? undefined : defaultTenantId ?? undefined,
      }),
    successMessage: "Invitation sent",
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setDevInviteUrl(data.devInviteUrl ?? null);
      setError(null);
      if (!data.devInviteUrl) {
        handleClose();
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  const createMutation = useAppMutation({
    mutationFn: () =>
      createUser(
        { ...basePayload, password },
        { tenantId: allTenants ? undefined : defaultTenantId ?? undefined },
      ),
    successMessage: "User created",
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const isPending = inviteMutation.isPending || createMutation.isPending;

  const passwordMismatch =
    mode === "direct" &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  const canSubmit =
    email.trim() &&
    name.trim() &&
    (!allTenants || entityValue) &&
    !isPending &&
    (mode === "invite"
      ? true
      : password.length >= 8 && password === confirmPassword);

  const handleClose = () => {
    setMode("invite");
    setEmail("");
    setName("");
    setPassword("");
    setConfirmPassword("");
    setEntityValue(defaultTenantId ?? "");
    setRole(isSuperAdmin ? "manager" : "staff");
    setDevInviteUrl(null);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (mode === "invite") {
      inviteMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} panelClassName="max-w-lg">
      <ModalHeader
        title="Add user"
        subtitle={
          mode === "invite"
            ? "Send an email invite so they set their own password."
            : "Create an active account with a password you set now."
        }
        onClose={handleClose}
      />
      <div className="space-y-3.5 px-4 pb-2">
        {devInviteUrl ? (
          <div className="rounded-lg border border-border bg-[var(--color-surface-muted)] p-3 text-sm">
            <p className="font-medium text-foreground">Invite sent</p>
            <p className="mt-1 text-muted">Dev invite link (non-production only):</p>
            <a
              href={devInviteUrl}
              className="mt-2 block break-all text-info underline"
              target="_blank"
              rel="noreferrer"
            >
              {devInviteUrl}
            </a>
          </div>
        ) : (
          <>
            <div className="flex gap-1 rounded-lg border border-border bg-[var(--color-surface-muted)] p-1">
              {(
                [
                  { id: "invite" as const, label: "Send invite" },
                  { id: "direct" as const, label: "Create directly" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    mode === tab.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
            {mode === "direct" ? (
              <>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  error={passwordMismatch ? "Passwords do not match" : undefined}
                  autoComplete="new-password"
                />
              </>
            ) : null}
            {allTenants ? (
              <Select
                label="Entity"
                value={entityValue}
                onChange={(e) => {
                  const next = e.target.value;
                  setEntityValue(next);
                  if (next === VAG_ENTITY_VALUE) {
                    setRole("super_admin");
                  } else if (role === "super_admin") {
                    setRole("manager");
                  }
                }}
                options={entityOptions}
              />
            ) : null}
            {entityValue !== VAG_ENTITY_VALUE ? (
              <Select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                options={roleOptions}
              />
            ) : null}
            {error ? <p className="text-sm text-error">{error}</p> : null}
          </>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={handleClose}>
          {devInviteUrl ? "Done" : "Cancel"}
        </Button>
        {!devInviteUrl ? (
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            {isPending
              ? "Saving…"
              : mode === "invite"
                ? "Send invite"
                : "Create user"}
          </Button>
        ) : null}
      </ModalFooter>
    </Modal>
  );
}
