import { Spinner } from "@/components/atoms/Spinner";

/** Overview route — shell stays; show loader while the segment resolves. */
export default function TenantOverviewLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8"
      aria-busy
      aria-label="Loading overview"
    >
      <Spinner size="lg" />
      <p className="text-sm text-muted">Loading overview…</p>
    </div>
  );
}
