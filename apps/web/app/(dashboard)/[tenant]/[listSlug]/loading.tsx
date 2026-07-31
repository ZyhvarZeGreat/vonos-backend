import { Hq6ListRouteSkeleton } from "@/components/organisms/skeletons";

/** Keep list chrome stable — table body shimmers while the route loads. */
export default function TenantListLoading() {
  return <Hq6ListRouteSkeleton />;
}
