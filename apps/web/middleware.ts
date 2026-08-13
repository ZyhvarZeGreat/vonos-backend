import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Correct accidental double mounts only.
 *
 * - No basePath: `/operations/operations/VC/…` → `/operations/VC/…`
 * - basePath=/operations: leaked `/operations/VC/…` (internal path after strip
 *   of a public `/operations/operations/VC/…`) → `/VC/…`
 *
 * Real ops pages live at `app/operations/[tenant]/…` when basePath is unset.
 */
export function middleware(request: NextRequest) {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
    .trim()
    .replace(/\/+$/, "");
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();

  if (basePath === "/operations") {
    const leaked = pathname.match(/^\/operations\/(VC|VS|VKW)(\/.*)?$/);
    if (!leaked) return NextResponse.next();
    const code = leaked[1]!;
    const rest = leaked[2] ?? "";
    url.pathname =
      !rest || rest === "/" ? `/${code}/overview` : `/${code}${rest}`;
    return NextResponse.redirect(url);
  }

  const double = pathname.match(
    /^\/operations\/operations\/(VC|VS|VKW)(\/.*)?$/,
  );
  if (!double) return NextResponse.next();

  const code = double[1]!;
  const rest = double[2] ?? "";
  url.pathname =
    !rest || rest === "/"
      ? `/operations/${code}/overview`
      : `/operations/${code}${rest}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/operations/VC",
    "/operations/VC/:path*",
    "/operations/VS",
    "/operations/VS/:path*",
    "/operations/VKW",
    "/operations/VKW/:path*",
    "/operations/operations/VC",
    "/operations/operations/VC/:path*",
    "/operations/operations/VS",
    "/operations/operations/VS/:path*",
    "/operations/operations/VKW",
    "/operations/operations/VKW/:path*",
  ],
};
