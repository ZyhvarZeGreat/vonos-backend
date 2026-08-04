import { Hq6ListRouteSkeleton } from "@/components/organisms/skeletons";

/** Page title chrome stays; only the table body shimmers. */
export default function TenantListLoading() {
  return <Hq6ListRouteSkeleton title=" " />;
}
