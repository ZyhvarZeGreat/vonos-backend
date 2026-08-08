import { withBasePath } from "@/lib/utils/basePath";

/**
 * Hard navigate to a list (or any) path. Prefer this after Save/Update —
 * App Router soft redirects often feel stuck on long form pages.
 */
export function goToList(path: string): void {
  if (typeof window === "undefined") return;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  window.location.assign(withBasePath(normalized));
}
