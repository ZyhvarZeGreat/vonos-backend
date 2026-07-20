import { DashboardBodySkeleton } from "@/components/organisms/skeletons";

export default function TenantRouteLoading() {
  return (
    <div className="mx-auto max-w-[var(--space-content-max)]">
      <DashboardBodySkeleton withFeed />
    </div>
  );
}
