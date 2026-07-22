"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";

const ROLE_PERMISSIONS: Record<string, { name: string; description: string }> = {
  super_admin: {
    name: "Super Admin",
    description: "Full access across all entities (VAG).",
  },
  admin: {
    name: "Admin",
    description: "Full access within this business entity.",
  },
  manager: {
    name: "Manager",
    description: "Create/edit records and approve workflow steps.",
  },
  staff: {
    name: "Staff",
    description: "Create/edit operational records.",
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access to dashboards and lists.",
  },
};

/**
 * HQ6 Roles Edit — route (not modal).
 * `/roles/:id/edit` — IMPLEMENT-FROM route/02-roles/edit.
 */
export function Hq6RoleDetailView({
  recordId,
  mode = "edit",
}: {
  recordId: string;
  mode?: "view" | "edit";
}) {
  const router = useRouter();
  const { listPath } = useRecordNavigation("roles");
  const role = ROLE_PERMISSIONS[recordId];

  if (!role) {
    return (
      <EmptyState
        title="Role not found"
        message="This role is not defined in Vonos."
        ctaLabel="Back to roles"
        onCta={() => router.push(listPath)}
      />
    );
  }

  return (
    <Hq6PageFrame
      title={mode === "edit" ? `Edit role · ${role.name}` : role.name}
      subtitle="Roles"
    >
      <div className="mb-4">
        <button
          type="button"
          className="hq6-btn hq6-btn-outline text-xs"
          onClick={() => router.push(listPath)}
        >
          Back to roles
        </button>
      </div>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#111827]">{role.name}</h3>
        <p className="text-sm text-[#555]">{role.description}</p>
        <p className="mt-4 text-xs text-[#777]">
          Built-in roles are fixed by Vonos permissions. Custom role editing will use the roles
          API when available.
        </p>
      </section>
    </Hq6PageFrame>
  );
}
