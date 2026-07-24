import { Hq6ListRouteSkeleton } from "@/components/organisms/skeletons";

/** Keep list chrome stable — only table body rows shimmer while the route loads. */
export default function TenantListLoading() {
  return <Hq6ListRouteSkeleton />;
}
