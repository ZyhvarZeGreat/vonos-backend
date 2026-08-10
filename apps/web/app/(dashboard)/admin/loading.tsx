import { Hq6ContentRouteSkeleton } from "@/components/organisms/skeletons";

/** Keep VAG chrome stable while the next admin screen chunk loads. */
export default function AdminLoading() {
  return <Hq6ContentRouteSkeleton title=" " />;
}
