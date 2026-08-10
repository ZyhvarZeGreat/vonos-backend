"use client";

import { AdminHrmTenantGate } from "@/components/molecules/AdminHrmTenantGate";
import { Hq6UsersListView } from "@/lib/registries/lazyEntityViews";

/** VAG HRM → Manage users (same list as entity apps). */
export default function AdminHrmUsersPage() {
  return (
    <AdminHrmTenantGate>
      <Hq6UsersListView />
    </AdminHrmTenantGate>
  );
}
