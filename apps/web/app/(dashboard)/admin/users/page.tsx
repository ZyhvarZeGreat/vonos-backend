"use client";

import { UsersView } from "@/components/pages/UsersSettingsViews";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        All tenants&apos; users — super admin view. Entity admins only see their own team on{" "}
        <code className="text-xs">/{`{entity}`}/users</code>.
      </p>
      <UsersView allTenants />
    </div>
  );
}
