import { Hq6ContentRouteSkeleton } from "@/components/organisms/skeletons";

/** Title stays; only the body shimmers — never a full-page spinner. */
export default function TenantSegmentLoading() {
  return <Hq6ContentRouteSkeleton title=" " />;
}
