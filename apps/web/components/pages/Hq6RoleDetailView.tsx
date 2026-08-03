"use client";

import { roleFormSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { TenantRole } from "@vonos/types";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import {
  createTenantRole,
  getTenantRole,
  updateTenantRole,
} from "@/lib/api/tenantRoles";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useAppPermissions } from "@/lib/hooks/useHq6Permissions";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  HQ6_ROLE_PERMISSION_MODULES,
  type Hq6RolePermissionModule,
} from "@/lib/registries/hq6RolePermissions";
import { toast } from "@/stores/toastStore";
import { notifyInsufficientPrivilege } from "@/lib/utils/privilegeToast";
import { cn } from "@/lib/utils/cn";

/**
 * Roles Edit/Add — permission matrix for TenantRoles (shared across all entities).
 * Only VAG (`super_admin`) may create/update; others get a read-only view.
 * `/roles/:id/edit` · `/roles/new/edit`
 */
export function Hq6RoleDetailView({
  recordId,
  mode = "edit",
}: {
  recordId: string;
  mode?: "view" | "edit";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const { listPath } = useRecordNavigation("roles");
  const { isVag, requireCan } = useAppPermissions();
  const isCreate = recordId === "new" || recordId === "create";

  const [roleName, setRoleName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(isCreate);

  useEffect(() => {
    if (!isCreate || isVag) return;
    notifyInsufficientPrivilege("action");
    router.replace(listPath);
  }, [isCreate, isVag, listPath, router]);

  const {
    data: existing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tenant-role", tenantId, recordId],
    queryFn: () => getTenantRole(tenantId!, recordId),
    enabled: Boolean(tenantId && !isCreate),
  });

  useEffect(() => {
    if (isCreate) {
      setRoleName("");
      setSelected(new Set());
      setHydrated(true);
      return;
    }
    if (!existing) return;
    setRoleName(existing.name);
    if (existing.locked || existing.name.trim().toLowerCase() === "admin") {
      // UPOS Admin had full access by default (not via role_has_permissions rows).
      const allKeys = HQ6_ROLE_PERMISSION_MODULES.flatMap((m) =>
        m.permissions.map((p) => p.key),
      );
      setSelected(new Set(allKeys));
    } else {
      setSelected(new Set(existing.permissions));
    }
    setHydrated(true);
  }, [existing, isCreate]);

  const toggleCheckbox = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const moduleKeys = useCallback((module: Hq6RolePermissionModule) => {
    return module.permissions.map((p) => p.key);
  }, []);

  const isModuleFullySelected = useCallback(
    (module: Hq6RolePermissionModule) => {
      const keys = moduleKeys(module);
      if (keys.length === 0) return false;
      return keys.every((k) => selected.has(k));
    },
    [moduleKeys, selected],
  );

  const toggleSelectAll = useCallback(
    (module: Hq6RolePermissionModule) => {
      const keys = moduleKeys(module);
      setSelected((prev) => {
        const next = new Set(prev);
        const allOn = keys.every((k) => next.has(k));
        if (allOn) {
          for (const k of keys) next.delete(k);
        } else {
          for (const k of keys) next.add(k);
        }
        return next;
      });
    },
    [moduleKeys],
  );

  const saveMutation = useMutation({
    mutationFn: async (): Promise<TenantRole> => {
      if (!isVag) {
        throw new Error("Only VAG can create or edit roles.");
      }
      if (!tenantId) throw new Error("No tenant selected");
      const valid = parseForm(roleFormSchema, { name: roleName });
      if (!valid) throw new Error("Role Name is required.");
      const name = valid.name;
      const permissions = Array.from(selected);
      const isServiceStaff = selected.has("is_service_staff");
      if (isCreate) {
        return createTenantRole(tenantId, {
          name,
          permissions,
          isServiceStaff,
          locked: name.toLowerCase() === "admin",
        });
      }
      return updateTenantRole(tenantId, recordId, {
        name,
        permissions,
        isServiceStaff,
      });
    },
    onSuccess: async (role) => {
      toast.success(
        isCreate ? `Role “${role.name}” added.` : `Role “${role.name}” updated.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["tenant-roles"] });
      await queryClient.invalidateQueries({
        queryKey: ["tenant-role", tenantId, role.id],
      });
      router.push(listPath);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save role");
    },
  });

  if (!tenantCode || !tenantId) {
    return (
      <EmptyState
        title="Select a business"
        message="Open a tenant to manage roles."
      />
    );
  }

  if (isCreate && !isVag) {
    return (
      <EmptyState
        title="VAG only"
        message="Only Vonos Autos Group (VAG) can create or edit role definitions."
        ctaLabel="Back to roles"
        onCta={() => router.push(listPath)}
      />
    );
  }

  if (!isCreate && isLoading) {
    return (
      <Hq6PageFrame title="Edit Role">
        <p className="tw-p-4 tw-text-sm tw-text-gray-500">Loading role…</p>
      </Hq6PageFrame>
    );
  }

  if (hydrated && !isCreate && (isError || !existing)) {
    return (
      <EmptyState
        title="Role not found"
        message="This role is not defined."
        ctaLabel="Back to roles"
        onCta={() => router.push(listPath)}
      />
    );
  }

  const readOnly = !isVag || mode === "view" || Boolean(existing?.locked);

  return (
    <Hq6PageFrame title={isCreate ? "Add Role" : "Edit Role"}>
      <div className="hq6-role-edit-box">
        <form
          className="hq6-role-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !requireCan(isCreate ? "roles.create" : "roles.update")
            ) {
              return;
            }
            if (!readOnly) saveMutation.mutate();
          }}
        >
          <div className="hq6-role-name-row">
            <div className="hq6-role-name-field">
              <label htmlFor="hq6-role-name">
                Role Name:<span className="req">*</span>
              </label>
              <input
                id="hq6-role-name"
                className="hq6-role-name-input"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={readOnly}
                placeholder="Role Name"
                autoFocus={isCreate || mode === "edit"}
                required
              />
            </div>
          </div>

          <div className="hq6-role-perms-label-row">
            <label>Permissions:</label>
            {!isCreate ? (
              <span className="tw-ml-2 tw-text-sm tw-text-gray-500">
                {existing?.locked ||
                existing?.name.trim().toLowerCase() === "admin"
                  ? "Full access (Admin)"
                  : `${selected.size} privilege${selected.size === 1 ? "" : "s"}`}
              </span>
            ) : null}
          </div>

          {HQ6_ROLE_PERMISSION_MODULES.map((module) => {
            const allSelected = isModuleFullySelected(module);
            return (
              <div key={module.id} className="hq6-role-check-group">
                <div className="hq6-role-check-module">
                  <h4>{module.label}</h4>
                </div>
                <div className="hq6-role-check-all">
                  <label className="hq6-icheck">
                    <span
                      className={cn(
                        "hq6-icheck-box",
                        allSelected && "is-checked",
                        readOnly && "is-disabled",
                      )}
                      aria-hidden
                    />
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={allSelected}
                      disabled={readOnly}
                      onChange={() => toggleSelectAll(module)}
                    />
                    Select all
                  </label>
                </div>
                <div className="hq6-role-check-perms">
                  {module.permissions.map((perm) => {
                    const checked = selected.has(perm.key);
                    return (
                      <div key={perm.key} className="hq6-role-perm-item">
                        <label className="hq6-icheck">
                          <span
                            className={cn(
                              "hq6-icheck-box",
                              checked && "is-checked",
                              readOnly && "is-disabled",
                            )}
                            aria-hidden
                          />
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            disabled={readOnly}
                            onChange={() => toggleCheckbox(perm.key)}
                          />
                          {perm.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!readOnly ? (
            <div className="hq6-role-edit-actions">
              <button
                type="button"
                className="hq6-role-cancel-btn"
                onClick={() => router.push(listPath)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="hq6-role-submit-btn"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? "Saving…"
                  : isCreate
                    ? "Save"
                    : "Update"}
              </button>
            </div>
          ) : existing?.locked ? (
            <p className="hq6-role-locked-note">
              The Admin role is locked and cannot be edited.
            </p>
          ) : !isVag ? (
            <p className="hq6-role-locked-note">
              Only Vonos Autos Group (VAG) can edit role permissions. You can
              view this matrix and assign roles to users.
            </p>
          ) : (
            <div className="hq6-role-edit-actions">
              <button
                type="button"
                className="hq6-role-cancel-btn"
                onClick={() => router.push(listPath)}
              >
                Back
              </button>
            </div>
          )}
        </form>
      </div>
    </Hq6PageFrame>
  );
}
