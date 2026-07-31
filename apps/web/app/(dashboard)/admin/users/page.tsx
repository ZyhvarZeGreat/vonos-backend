"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /admin/users → Manage users under VAG HRM. */
export default function AdminUsersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/hrm/users");
  }, [router]);
  return (
    <p className="text-sm text-muted">Redirecting to Manage users…</p>
  );
}
