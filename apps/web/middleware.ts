import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * VC / VS / VKW public URLs are `/operations/{CODE}/…` when the app is not already
 * mounted at `basePath=/operations`. Client-side App Router navigations do not
 * reliably apply next.config rewrites, so without this middleware soft links
 * match `[tenant]=operations` and break every subroute.
 */
export function middleware(request: NextRequest) {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
    .trim()
    .replace(/\/+$/, "");
  // Production apex mount already strips `/operations`; paths are `/VS/…`.
  if (basePath === "/operations") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/operations\/(VC|VS|VKW)(\/.*)?$/);
  if (!match) return NextResponse.next();

  const code = match[1]!;
  const rest = match[2] ?? "";
  const url = request.nextUrl.clone();
  url.pathname = !rest || rest === "/" ? `/${code}/overview` : `/${code}${rest}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/operations/VC",
    "/operations/VC/:path*",
    "/operations/VS",
    "/operations/VS/:path*",
    "/operations/VKW",
    "/operations/VKW/:path*",
  ],
};
