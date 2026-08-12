"use client";

import { roleFormSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { TenantRole } from "@vonos/types";
import {
  FINANCE_ROLE_DEFAULT_PERMISSIONS,
  HR_ROLE_DEFAULT_PERMISSIONS,
  isFinanceAuthorizedRoleName,
  isHrRoleName,
} from "@vonos/types";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import {
  createTenantRole,
  getTenantRole,
  updateTenantRole,
} from "@/lib/api/tenantRoles";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useAppPermissions } from "@/lib/hooks/useHq6Permissions";
import {
  useIsVagRolesCatalogRoute,
  useRolesCatalogTenantId,
} from "@/lib/hooks/useRolesCatalogTenantId";
import {
  HQ6_ROLE_PERMISSION_MODULES,
  type Hq6RolePermissionModule,
} from "@/lib/registries/hq6RolePermissions";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { notifyInsufficientPrivilege } from "@/lib/utils/privilegeToast";
import { cn } from "@/lib/utils/cn";
import { isTransientWriteError } from "@/lib/utils/withWriteRetries";
import {
  newIdempotencyKey,
  withIdempotencyKey,
} from "@/lib/utils/idempotency";

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
  const tenantId = useRolesCatalogTenantId();
  const isVagCatalog = useIsVagRolesCatalogRoute();
  const { listPath, goToList } = useRecordNavigation("roles");
  const { isVag, can, requireCan } = useAppPermissions();
  const authHydrated = useAuthStore((s) => s.hydrated);
  const isCreate = recordId === "new" || recordId === "create";
  const canEditMatrix = isCreate
    ? can("roles.create")
    : can("roles.update");

  const [roleName, setRoleName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(isCreate);
  /** Avoid re-applying name presets after the user edits checkboxes. */
  const appliedNamePresetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isCreate || canEditMatrix) return;
    notifyInsufficientPrivilege("action");
    router.replace(listPath);
  }, [isCreate, canEditMatrix, listPath, router]);

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
      appliedNamePresetRef.current = null;
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

  /** On create: HR → staff onboard matrix; Accountant → finance defaults. */
  useEffect(() => {
    if (!isCreate || !canEditMatrix) return;
    const name = roleName.trim();
    if (!name) return;
    if (appliedNamePresetRef.current === name.toLowerCase()) return;

    if (isHrRoleName(name)) {
      appliedNamePresetRef.current = name.toLowerCase();
      setSelected(new Set(HR_ROLE_DEFAULT_PERMISSIONS));
      return;
    }
    if (isFinanceAuthorizedRoleName(name)) {
      appliedNamePresetRef.current = name.toLowerCase();
      setSelected((prev) => {
        const next = new Set(prev);
        for (const key of FINANCE_ROLE_DEFAULT_PERMISSIONS) next.add(key);
        return next;
      });
    }
  }, [isCreate, canEditMatrix, roleName]);

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

  const roleIdempotencyKeyRef = useRef<string | null>(null);

  type RoleSavePayload = {
    name: string;
    permissions: string[];
    isServiceStaff: boolean;
  };

  const patchRolesListCache = useCallback(
    (role: Pick<TenantRole, "id" | "name" | "permissions" | "isServiceStaff">) => {
      if (!tenantId) return;
      queryClient.setQueryData<TenantRole[]>(
        ["tenant-roles", tenantId],
        (old) => {
          const rows = old ?? [];
          const nameKey = role.name.trim().toLowerCase();
          const idx = rows.findIndex(
            (r) =>
              r.id === role.id || r.name.trim().toLowerCase() === nameKey,
          );
          if (idx < 0) {
            if (isCreate) {
              return [
                {
                  id: role.id,
                  tenantId,
                  name: role.name,
                  permissions: role.permissions,
                  isServiceStaff: role.isServiceStaff,
                  locked: role.name.trim().toLowerCase() === "admin",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                ...rows,
              ];
            }
            return rows;
          }
          const next = [...rows];
          next[idx] = {
            ...next[idx]!,
            name: role.name,
            permissions: role.permissions,
            isServiceStaff: role.isServiceStaff,
            updatedAt: new Date().toISOString(),
          };
          return next;
        },
      );
    },
    [tenantId, queryClient, isCreate],
  );

  const saveMutation = useMutation({
    retry: (failureCount, error) =>
      failureCount < 2 && isTransientWriteError(error),
    mutationFn: async (payload: RoleSavePayload): Promise<TenantRole> => {
      const key = roleIdempotencyKeyRef.current ?? newIdempotencyKey();
      roleIdempotencyKeyRef.current = key;
      return withIdempotencyKey(key, async () => {
        if (!canEditMatrix) {
          throw new Error("Only VAG can create or edit roles.");
        }
        if (!tenantId) throw new Error("No tenant selected");
        if (isCreate) {
          return createTenantRole(tenantId, {
            name: payload.name,
            permissions: payload.permissions,
            isServiceStaff: payload.isServiceStaff,
            locked: payload.name.toLowerCase() === "admin",
          });
        }
        return updateTenantRole(tenantId, recordId, {
          name: payload.name,
          permissions: payload.permissions,
          isServiceStaff: payload.isServiceStaff,
        });
      });
    },
    onSuccess: async (role) => {
      toast.success(
        isCreate
          ? `Role “${role.name}” added.`
          : `Role “${role.name}” saved.`,
      );
      patchRolesListCache(role);
      await queryClient.invalidateQueries({ queryKey: ["tenant-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["tenant-role"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save role");
      void queryClient.invalidateQueries({ queryKey: ["tenant-roles"] });
    },
    onSettled: () => {
      roleIdempotencyKeyRef.current = null;
    },
  });

  if (!authHydrated) {
    return (
      <Hq6PageFrame title={isCreate ? "Add Role" : "Edit Role"}>
        <p className="tw-p-4 tw-text-sm tw-text-gray-500">Loading…</p>
      </Hq6PageFrame>
    );
  }

  if (!tenantId) {
    return (
      <EmptyState
        title="Select a business"
        message="Open a tenant to manage roles, or sign in as VAG to edit the shared catalog."
      />
    );
  }

  if (isCreate && !canEditMatrix) {
    return (
      <EmptyState
        title="Missing permission"
        message="Your role needs Add Role or Edit Role to change role definitions."
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

  // Users with roles.* may edit any non-locked role; Admin stays locked by design.
  const readOnly =
    !canEditMatrix || mode === "view" || Boolean(existing?.locked);

  return (
    <Hq6PageFrame title={isCreate ? "Add Role" : "Edit Role"}>
      {isVagCatalog || isVag ? (
        <p className="tw-mb-3 tw-text-sm tw-text-gray-600">
          Role definitions are shared across all operating entities. Saving
          updates every entity’s copy of this role by name. HR roles onboard
          staff by default; only Accountant gets Financial dashboard access
          unless you tick that checkbox for another role (including HR).
        </p>
      ) : canEditMatrix ? (
        <p className="tw-mb-3 tw-text-sm tw-text-gray-600">
          Changes save on this entity and sync to the shared role catalog across
          operating entities by role name.
        </p>
      ) : (
        <p className="tw-mb-3 tw-text-sm tw-text-gray-600">
          You can view permissions here. Editing requires Add/Edit Role on your
          assigned job role; assign roles on the Users page.
        </p>
      )}
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
            if (readOnly) return;
            const valid = parseForm(roleFormSchema, { name: roleName });
            if (!valid) {
              toast.error("Role Name is required.");
              return;
            }
            // Capture before leave-first navigation unmounts this form.
            const payload: RoleSavePayload = {
              name: valid.name,
              permissions: Array.from(selected),
              isServiceStaff: selected.has("is_service_staff"),
            };
            patchRolesListCache({
              id: isCreate ? `temp-${payload.name}` : recordId,
              name: payload.name,
              permissions: payload.permissions,
              isServiceStaff: payload.isServiceStaff,
            });
            goToList(
              isCreate
                ? "Creating role…"
                : "Saving & returning to roles…",
            );
            saveMutation.mutate(payload);
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
            <span className="tw-ml-2 tw-text-sm tw-text-gray-500">
              {existing?.locked ||
              roleName.trim().toLowerCase() === "admin" ||
              existing?.name.trim().toLowerCase() === "admin"
                ? "Full access (Admin)"
                : `${selected.size} privilege${selected.size === 1 ? "" : "s"}`}
            </span>
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
          ) : !canEditMatrix ? (
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
