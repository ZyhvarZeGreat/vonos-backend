"use client";

import { useMemo, useState } from "react";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import type { Role, User } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { Select } from "@/components/atoms/Select";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { createUser, inviteUser } from "@/lib/api/users";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import {
  optimisticTempId,
  prependEntityInQueries,
} from "@/lib/query/optimistic";
import { AUTOS_GROUP_ENTITIES } from "@/lib/registries/tenants";
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

function joinName(
  prefix: string,
  first: string,
  middle: string,
  last: string,
): string {
  return [prefix, first, middle, last]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

export function InviteUserModal({
  open,
  onClose,
  allTenants = false,
  defaultTenantId,
}: InviteUserModalProps) {
  const isHq6 = useIsVaHq6();
  const actorRole = useAuthStore((state) => state.role);
  const isSuperAdmin = actorRole === "super_admin";

  /** UPOS Add User is create-with-password; invite is the secondary path. */
  const [mode, setMode] = useState<AddUserMode>("direct");
  const [prefix, setPrefix] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [allowLogin, setAllowLogin] = useState(true);
  const [entityValue, setEntityValue] = useState(
    defaultTenantId ?? (allTenants ? "" : defaultTenantId ?? ""),
  );
  const [role, setRole] = useState<Role>(isSuperAdmin ? "manager" : "staff");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fullName = joinName(prefix, firstName, middleName, lastName);

  const entityOptions = useMemo(() => {
    const options = [{ value: "", label: "Select entity…" }];
    if (allTenants && isSuperAdmin) {
      options.push({ value: VAG_ENTITY_VALUE, label: "Vonos Autos Group (VAG)" });
    }
    for (const entity of AUTOS_GROUP_ENTITIES) {
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
    name: fullName,
    role: resolvedRole,
    tenantId: allTenants ? resolvedTenantId : undefined,
  };

  const inviteMutation = useAppMutation({
    mutationFn: () =>
      inviteUser(basePayload, {
        tenantId: allTenants ? undefined : defaultTenantId ?? undefined,
      }),
    successMessage: "Invitation sent",
    optimistic: {
      keys: [["users"]],
      update: (qc) => {
        const now = new Date().toISOString();
        prependEntityInQueries(qc, ["users"], {
          id: optimisticTempId("user"),
          email: email.trim(),
          name: fullName.trim(),
          role: resolvedRole,
          status: "invited",
          tenantId: allTenants
            ? entityValue === VAG_ENTITY_VALUE
              ? null
              : entityValue || null
            : (defaultTenantId ?? null),
          createdAt: now,
          lastLoginAt: null,
        } satisfies User);
      },
      commit: (qc, data) => {
        if (!data?.user) return;
        const entries = qc.getQueriesData({ queryKey: ["users"] });
        for (const [queryKey, cached] of entries) {
          if (Array.isArray(cached)) {
            qc.setQueryData(
              queryKey,
              (cached as User[]).filter((row) => !row.id.startsWith("user-")),
            );
          } else if (
            cached &&
            typeof cached === "object" &&
            Array.isArray((cached as { items?: User[] }).items)
          ) {
            const list = cached as { items: User[] };
            qc.setQueryData(queryKey, {
              ...list,
              items: list.items.filter((row) => !row.id.startsWith("user-")),
            });
          }
        }
        prependEntityInQueries(qc, ["users"], data.user);
      },
    },
    onSuccess: (data) => {
      setInviteLink(data.devInviteUrl ?? null);
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
    optimistic: {
      keys: [["users"]],
      update: (qc) => {
        const now = new Date().toISOString();
        prependEntityInQueries(qc, ["users"], {
          id: optimisticTempId("user"),
          email: email.trim(),
          name: fullName.trim(),
          role: resolvedRole,
          status: "active",
          tenantId: allTenants
            ? entityValue === VAG_ENTITY_VALUE
              ? null
              : entityValue || null
            : (defaultTenantId ?? null),
          createdAt: now,
          lastLoginAt: null,
        } satisfies User);
        setDismissed(true);
      },
      commit: (qc, data) => {
        if (!data?.user) return;
        const entries = qc.getQueriesData({ queryKey: ["users"] });
        for (const [queryKey, cached] of entries) {
          if (Array.isArray(cached)) {
            qc.setQueryData(
              queryKey,
              (cached as User[]).filter((row) => !row.id.startsWith("user-")),
            );
          } else if (
            cached &&
            typeof cached === "object" &&
            Array.isArray((cached as { items?: User[] }).items)
          ) {
            const list = cached as { items: User[] };
            qc.setQueryData(queryKey, {
              ...list,
              items: list.items.filter((row) => !row.id.startsWith("user-")),
            });
          }
        }
        prependEntityInQueries(qc, ["users"], data.user);
      },
    },
    onSuccess: () => {
      setDismissed(false);
      handleClose();
    },
    onError: (err: Error) => {
      setDismissed(false);
      setError(err.message);
    },
  });

  const isPending = inviteMutation.isPending || createMutation.isPending;

  const passwordMismatch =
    mode === "direct" &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  const canSubmit =
    email.trim() &&
    firstName.trim() &&
    (!allTenants || entityValue) &&
    !isPending &&
    (mode === "invite"
      ? true
      : password.length >= 8 && password === confirmPassword);

  const handleClose = () => {
    setMode("direct");
    setPrefix("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setAllowLogin(true);
    setEntityValue(defaultTenantId ?? "");
    setRole(isSuperAdmin ? "manager" : "staff");
    setInviteLink(null);
    setError(null);
    setDismissed(false);
    onClose();
  };

  const handleSubmit = () => {
    if (mode === "invite") {
      inviteMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  /** Matches Ultimate POS contact / tax-rate add modals (Hq6AddSupplierModal). */
  const hq6FormBody = (
    <div className="space-y-4">
      {inviteLink ? (
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3 text-sm">
          <p className="mb-1 font-semibold text-[#111827]">Invitation created</p>
          <p className="mb-2 text-[#6b7280]">
            Share this link so they can set their password:
          </p>
          <a
            href={inviteLink}
            className="block break-all text-[#3c8dbc] underline"
            target="_blank"
            rel="noreferrer"
          >
            {inviteLink}
          </a>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#111827]">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="add_user_mode"
                checked={mode === "direct"}
                onChange={() => {
                  setMode("direct");
                  setError(null);
                }}
              />
              Create user
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="add_user_mode"
                checked={mode === "invite"}
                onChange={() => {
                  setMode("invite");
                  setError(null);
                }}
              />
              Send invite
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Hq6Field label="Prefix">
              <input
                className="hq6-modal-input"
                placeholder="Mr / Mrs / Miss"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="First Name" required>
              <input
                className="hq6-modal-input"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Middle name">
              <input
                className="hq6-modal-input"
                placeholder="Middle name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Last Name">
              <input
                className="hq6-modal-input"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Hq6Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Hq6Field label="Email" required>
              <input
                type="email"
                className="hq6-modal-input"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!username) {
                    setUsername(e.target.value.split("@")[0] ?? "");
                  }
                }}
              />
            </Hq6Field>
            {allTenants ? (
              <Hq6Field label="Entity" required>
                <select
                  className="hq6-modal-input"
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
                >
                  {entityOptions.map((opt) => (
                    <option key={opt.value || "empty"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Hq6Field>
            ) : (
              <div />
            )}
          </div>

          {mode === "direct" ? (
            <>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#374151]">
                <input
                  type="checkbox"
                  className="input-icheck"
                  checked={allowLogin}
                  onChange={(e) => setAllowLogin(e.target.checked)}
                />
                Allow login
              </label>
              {allowLogin ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Hq6Field label="Username">
                    <input
                      className="hq6-modal-input"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </Hq6Field>
                  <Hq6Field label="Password" required>
                    <input
                      type="password"
                      className="hq6-modal-input"
                      placeholder="Password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Hq6Field>
                  <Hq6Field label="Confirm Password" required>
                    <input
                      type="password"
                      className="hq6-modal-input"
                      placeholder="Confirm Password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Hq6Field>
                </div>
              ) : null}
              {passwordMismatch ? (
                <p className="mb-0 text-sm text-[#dc2626]">
                  Passwords do not match
                </p>
              ) : null}
            </>
          ) : null}

          {entityValue !== VAG_ENTITY_VALUE ? (
            <Hq6Field label="Role" required>
              <select
                className="hq6-modal-input"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Hq6Field>
          ) : (
            <p className="mb-0 text-xs text-[#6b7280]">
              VAG users are created as Super Admin.
            </p>
          )}

          {error ? <p className="mb-0 text-sm text-[#dc2626]">{error}</p> : null}
        </>
      )}
    </div>
  );

  const legacyFormBody = (
    <div className="space-y-3.5 px-4 pb-2">
      {inviteLink ? (
        <div className="rounded-lg border border-border bg-[var(--color-surface-muted)] p-3 text-sm">
          <p className="font-medium text-foreground">Invitation created</p>
          <p className="mt-1 text-muted">
            Share this link with the person you invited so they can set their
            password:
          </p>
          <a
            href={inviteLink}
            className="mt-2 block break-all text-info underline"
            target="_blank"
            rel="noreferrer"
          >
            {inviteLink}
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
            value={fullName}
            onChange={(e) => {
              setPrefix("");
              setFirstName(e.target.value);
              setLastName("");
            }}
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
  );

  if (isHq6) {
    return (
      <Hq6Modal
        open={open && !dismissed}
        onClose={handleClose}
        title="Add user"
        size="xl"
        footer={
          <Hq6ModalSaveClose
            onClose={handleClose}
            closeLabel={inviteLink ? "Done" : "Close"}
            onSave={inviteLink ? undefined : handleSubmit}
            saveLabel={mode === "invite" ? "Send invite" : "Save"}
            saving={isPending}
            saveDisabled={!canSubmit}
          />
        }
      >
        {hq6FormBody}
      </Hq6Modal>
    );
  }

  return (
    <Modal open={open && !dismissed} onClose={handleClose} panelClassName="max-w-lg">
      <ModalHeader
        title="Add user"
        subtitle={
          mode === "invite"
            ? "Send an email invite so they set their own password."
            : "Create an active account with a password you set now."
        }
        onClose={handleClose}
      />
      {legacyFormBody}
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={handleClose}>
          {inviteLink ? "Done" : "Cancel"}
        </Button>
        {!inviteLink ? (
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
