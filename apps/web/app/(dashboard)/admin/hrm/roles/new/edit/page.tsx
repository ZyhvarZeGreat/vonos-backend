"use client";

import { AdminHrmTenantGate } from "@/components/molecules/AdminHrmTenantGate";
import { Hq6RoleDetailView } from "@/components/pages/Hq6RoleDetailView";

/** VAG HRM → Add roles (same matrix form as `/VA/roles/new/edit`). */
export default function AdminHrmAddRolePage() {
  return (
    <AdminHrmTenantGate>
      <Hq6RoleDetailView recordId="new" mode="edit" />
    </AdminHrmTenantGate>
  );
}
