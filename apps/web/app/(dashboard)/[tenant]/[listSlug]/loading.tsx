import { DataTableSkeleton } from "@/components/organisms/skeletons";

export default function TenantListLoading() {
  return (
    <div className="mx-auto max-w-[var(--space-content-max)] space-y-6">
      <DataTableSkeleton rows={10} columns={5} />
    </div>
  );
}
