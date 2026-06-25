/**
 * Skip login only when NEXT_PUBLIC_SKIP_AUTH=true.
 */
export function isAuthSkipped(): boolean {
  return process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
}
