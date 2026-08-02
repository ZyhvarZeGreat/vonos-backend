/**
 * App mount path (e.g. `/operations`). Empty string = site root.
 * Must match `basePath` in next.config.ts (build-time).
 */
export const APP_BASE_PATH = (
  process.env.NEXT_PUBLIC_BASE_PATH ?? ""
).replace(/\/+$/, "");

/** Prefix an app-absolute path for hard navigations (`window.location`, `<a href>`). */
export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  if (!APP_BASE_PATH) return path;
  if (path === APP_BASE_PATH || path.startsWith(`${APP_BASE_PATH}/`)) {
    return path;
  }
  return `${APP_BASE_PATH}${path}`;
}

/**
 * Prefix a public-folder path for next/image / <img> when the app is mounted
 * under NEXT_PUBLIC_BASE_PATH (e.g. `/operations/brand/...`).
 */
export function publicAssetPath(path: string): string {
  return withBasePath(path.startsWith("/") ? path : `/${path}`);
}

/** Strip basePath from `window.location.pathname` so route logic sees `/VA/...`. */
export function stripBasePath(pathname: string): string {
  if (!APP_BASE_PATH) return pathname;
  if (pathname === APP_BASE_PATH) return "/";
  if (pathname.startsWith(`${APP_BASE_PATH}/`)) {
    return pathname.slice(APP_BASE_PATH.length) || "/";
  }
  return pathname;
}
