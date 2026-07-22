"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@vonos/types";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { getUsers, type UserListRow } from "@/lib/api/users";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatDate } from "@/lib/utils/formatDate";
import { DetailPageSkeleton } from "@/components/organisms/skeletons";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";

function formatRole(role: User["role"]): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(status: User["status"]): string {
  if (status === "active") return "Active";
  if (status === "invited") return "Invited";
  return "Suspended";
}

function statusBadgeClass(status: User["status"]): string {
  if (status === "active") return "hq6-pay-paid";
  if (status === "invited") return "hq6-pay-partial";
  return "hq6-pay-due";
}

/**
 * HQ6 user View / Edit / Delete — routes (not modals).
 * `/users/:id`, `/users/:id/edit` — IMPLEMENT-FROM route/01-users.
 */
export function Hq6UserDetailView({
  recordId,
  mode = "view",
}: {
  recordId: string;
  mode?: "view" | "edit";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = useTenantId();
  const { listPath, detailPath } = useRecordNavigation("users");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "delete") {
      setDeleteOpen(true);
    }
  }, [searchParams]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users", tenantId, "detail-lookup"],
    queryFn: () => getUsers(tenantId!),
    enabled: Boolean(tenantId),
  });

  const user = useMemo(
    () => users.find((row: UserListRow) => row.id === recordId) ?? null,
    [users, recordId],
  );

  if (!tenantId || isLoading) return <DetailPageSkeleton />;

  if (!user) {
    return (
      <EmptyState
        title="User not found"
        message="This user could not be loaded."
        ctaLabel="Back to users"
        onCta={() => router.push(listPath)}
      />
    );
  }

  const username = user.email.split("@")[0] ?? user.email;
  const isEdit = mode === "edit";

  return (
    <Hq6PageFrame
      title={isEdit ? `Edit user · ${user.name}` : user.name}
      subtitle={isEdit ? "Edit user" : "User profile"}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="hq6-btn hq6-btn-outline text-xs"
          onClick={() => router.push(listPath)}
        >
          Back to users
        </button>
        <div className="flex flex-wrap gap-2">
          {!isEdit ? (
            <button
              type="button"
              className="hq6-btn hq6-btn-blue text-xs"
              onClick={() => router.push(`${detailPath(recordId)}/edit`)}
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              className="hq6-btn hq6-btn-outline text-xs"
              onClick={() => router.push(detailPath(recordId))}
            >
              View
            </button>
          )}
          <button
            type="button"
            className="hq6-btn hq6-btn-outline text-xs text-[#b91c1c]"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#111827]">
          {isEdit ? "Edit user" : "User details"}
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#777]">Username</dt>
            <dd className="font-medium text-[#111827]">{username}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Name</dt>
            <dd className="font-medium text-[#111827]">{user.name}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Email</dt>
            <dd className="font-medium text-[#111827]">{user.email}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Role</dt>
            <dd className="font-medium text-[#111827]">{formatRole(user.role)}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Status</dt>
            <dd>
              <span className={cn("hq6-pay-badge", statusBadgeClass(user.status))}>
                {formatStatus(user.status)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[#777]">Last sign-in</dt>
            <dd className="font-medium text-[#111827]">
              {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
            </dd>
          </div>
        </dl>
        {isEdit ? (
          <p className="mt-4 text-xs text-[#777]">
            Profile edits use invite / role management. Role and status changes will use the
            users API when available.
          </p>
        ) : null}
      </section>

      <Hq6ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          toast.info(
            `Soft-delete for “${user.name}” will use the users API when available.`,
          );
          setDeleteOpen(false);
          router.push(listPath);
        }}
        title="Delete user"
        message={`Delete “${user.name}”? This will deactivate the account when the API is wired.`}
        confirmLabel="Delete"
      />
    </Hq6PageFrame>
  );
}
