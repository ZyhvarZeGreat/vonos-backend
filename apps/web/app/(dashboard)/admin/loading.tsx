import { DashboardBodySkeleton } from "@/components/organisms/skeletons";

export default function AdminRouteLoading() {
  return (
    <div className="mx-auto max-w-[var(--space-content-max)]">
      <DashboardBodySkeleton />
    </div>
  );
}
