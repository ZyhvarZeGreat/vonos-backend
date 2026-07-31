import { Spinner } from "@/components/atoms/Spinner";

/** Default segment loader while the next page prepares. */
export default function TenantSegmentLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8"
      aria-busy
      aria-label="Loading"
    >
      <Spinner size="lg" />
      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}
