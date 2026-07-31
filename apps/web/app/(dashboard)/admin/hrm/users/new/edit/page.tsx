"use client";

import { AdminHrmTenantGate } from "@/components/molecules/AdminHrmTenantGate";
import { Hq6UserDetailView } from "@/components/pages/Hq6UserDetailView";

/** VAG HRM → Add users (same create form as `/VA/users/new/edit`). */
export default function AdminHrmAddUserPage() {
  return (
    <AdminHrmTenantGate>
      <Hq6UserDetailView recordId="new" mode="edit" />
    </AdminHrmTenantGate>
  );
}
