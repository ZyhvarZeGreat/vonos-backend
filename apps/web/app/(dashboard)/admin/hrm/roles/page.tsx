"use client";

import { AdminHrmTenantGate } from "@/components/molecules/AdminHrmTenantGate";
import { Hq6RolesListView } from "@/lib/registries/lazyEntityViews";

/** VAG HRM → Manage roles (same list as entity apps; VAG can create/edit). */
export default function AdminHrmRolesPage() {
  return (
    <AdminHrmTenantGate>
      <Hq6RolesListView />
    </AdminHrmTenantGate>
  );
}
