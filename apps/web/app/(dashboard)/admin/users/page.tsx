"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /admin/users → /admin/hrm (matches VA HRM naming). */
export default function AdminUsersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/hrm");
  }, [router]);
  return (
    <p className="text-sm text-muted">Redirecting to HRM…</p>
  );
}
