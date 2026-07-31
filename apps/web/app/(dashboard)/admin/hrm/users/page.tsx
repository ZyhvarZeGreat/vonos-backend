"use client";

import { AdminHrmTenantGate } from "@/components/molecules/AdminHrmTenantGate";
import { Hq6UsersListView } from "@/components/pages/Hq6UsersListView";

/** VAG HRM → Manage users (same list as entity apps). */
export default function AdminHrmUsersPage() {
  return (
    <AdminHrmTenantGate>
      <Hq6UsersListView />
    </AdminHrmTenantGate>
  );
}
