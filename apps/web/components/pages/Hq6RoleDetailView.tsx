"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  HQ6_ROLE_PERMISSION_MODULES,
  loadStoredRoles,
  saveStoredRoles,
  slugifyRoleName,
  type Hq6RolePermissionModule,
  type Hq6StoredRole,
} from "@/lib/registries/hq6RolePermissions";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";

/**
 * HQ6 Roles Edit/Add — matches Ultimate POS form layout.
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
  const { tenantCode } = useRouteTenant();
  const { listPath } = useRecordNavigation("roles");
  const isCreate = recordId === "new" || recordId === "create";

  const [roles, setRoles] = useState<Hq6StoredRole[]>([]);
  const [roleName, setRoleName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!tenantCode) return;
    const stored = loadStoredRoles(tenantCode);
    setRoles(stored);
    if (isCreate) {
      setRoleName("");
      setSelected(new Set());
    } else {
      const match =
        stored.find((row) => row.id === recordId) ??
        stored.find(
          (row) => slugifyRoleName(row.name) === slugifyRoleName(recordId),
        );
      if (match) {
        setRoleName(match.name);
        setSelected(new Set(match.permissions));
      }
    }
    setHydrated(true);
  }, [isCreate, recordId, tenantCode]);

  const existing = useMemo(() => {
    if (isCreate) return null;
    return (
      roles.find((row) => row.id === recordId) ??
      roles.find(
        (row) => slugifyRoleName(row.name) === slugifyRoleName(recordId),
      ) ??
      null
    );
  }, [isCreate, recordId, roles]);

  const toggleCheckbox = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectRadio = useCallback(
    (group: string, key: string, module: Hq6RolePermissionModule) => {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const perm of module.permissions) {
          if (perm.type === "radio" && perm.group === group) {
            next.delete(perm.key);
          }
        }
        next.add(key);
        return next;
      });
    },
    [],
  );

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

  const handleSave = () => {
    const name = roleName.trim();
    if (!name) {
      toast.error("Role Name is required.");
      return;
    }
    if (!tenantCode) return;

    const permissions = Array.from(selected);
    const isServiceStaff = selected.has("is_service_staff");

    let nextRoles: Hq6StoredRole[];
    if (existing) {
      nextRoles = roles.map((row) =>
        row.id === existing.id
          ? {
              ...row,
              name,
              permissions,
              isServiceStaff,
              locked: row.locked || name === "Admin",
            }
          : row,
      );
      toast.success(`Role “${name}” updated.`);
    } else {
      const id = slugifyRoleName(name);
      nextRoles = [
        ...roles,
        {
          id,
          name,
          permissions,
          isServiceStaff,
          locked: name === "Admin",
        },
      ];
      toast.success(`Role “${name}” added.`);
    }

    saveStoredRoles(tenantCode, nextRoles);
    setRoles(nextRoles);
    router.push(listPath);
  };

  if (!tenantCode) {
    return (
      <EmptyState
        title="Select a business"
        message="Open a tenant to manage roles."
      />
    );
  }

  if (hydrated && !isCreate && !existing) {
    return (
      <EmptyState
        title="Role not found"
        message="This role is not defined."
        ctaLabel="Back to roles"
        onCta={() => router.push(listPath)}
      />
    );
  }

  const readOnly = mode === "view" || existing?.locked;

  return (
    <Hq6PageFrame title={isCreate ? "Add Role" : "Edit Role"}>
      <div className="hq6-role-edit-box">
        <form
          className="hq6-role-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!readOnly) handleSave();
          }}
        >
          <div className="hq6-role-name-row">
            <div className="hq6-role-name-field">
              <label htmlFor="hq6-role-name">Role Name:*</label>
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
                    if (perm.type === "radio" && perm.group) {
                      return (
                        <div key={`${perm.group}:${perm.key}`} className="hq6-role-perm-item">
                          <label className="hq6-icheck">
                            <span
                              className={cn(
                                "hq6-iradio",
                                checked && "is-checked",
                                readOnly && "is-disabled",
                              )}
                              aria-hidden
                            />
                            <input
                              type="radio"
                              className="sr-only"
                              name={`${module.id}:${perm.group}`}
                              checked={checked}
                              disabled={readOnly}
                              onChange={() =>
                                selectRadio(perm.group!, perm.key, module)
                              }
                            />
                            {perm.label}
                          </label>
                        </div>
                      );
                    }
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
              <button type="submit" className="hq6-role-submit-btn">
                {isCreate ? "Save" : "Update"}
              </button>
            </div>
          ) : existing?.locked ? (
            <p className="hq6-role-locked-note">
              The Admin role is locked and cannot be edited.
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
