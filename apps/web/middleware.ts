import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * The ops app is public and every URL under an entity prefix renders on demand
 * (~27KB/response, cache MISS). Crawlers/scanners enumerating /VA/*, /VW/*,
 * /VISP/* were the dominant source of edge bandwidth + renders.
 *
 * This gate runs ONLY on entity app prefixes (never marketing), and:
 *  - rejects known bots / scrapers / requests with no User-Agent (404, no render)
 *  - rejects non-navigation requests that are neither HTML navigations nor
 *    Next.js RSC/prefetch requests
 *  - tags every app response `x-robots-tag: noindex, nofollow`
 *
 * Real browser navigations and Next.js route prefetches pass through untouched.
 * Keep APP_PREFIXES in sync with app/robots.ts.
 */
const APP_PREFIXES = [
  "/VA",
  "/VW",
  "/VISP",
  "/VSP",
  "/VC",
  "/VS",
  "/VKW",
  "/VP",
  "/admin",
  "/operations",
  "/dev",
  "/maintenance",
];

const BOT_RE =
  /(bot|crawler|spider|crawl|scrapy|python-requests|python-urllib|aiohttp|httpx|curl\/|wget|libwww|go-http-client|okhttp|java\/|headlesschrome|phantomjs|puppeteer|playwright|selenium|semrush|ahrefs|dataforseo|bytespider|gptbot|chatgpt-user|oai-searchbot|ccbot|claudebot|claude-web|anthropic|perplexity|amazonbot|applebot|petalbot|yandex|baiduspider|sogou|mj12|dotbot|zoominfo|uptimerobot|pingdom|statuscake|nmap|nikto|masscan|zgrab|nuclei|censys|internetmeasurement)/i;

function isAppPath(pathname: string): boolean {
  return APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isAppPath(pathname)) return NextResponse.next();

  const ua = request.headers.get("user-agent") ?? "";
  const accept = request.headers.get("accept") ?? "";
  const isRscRequest =
    request.headers.get("rsc") === "1" ||
    accept.includes("text/x-component") ||
    request.headers.has("next-router-prefetch");
  const isNavigation =
    request.headers.get("sec-fetch-mode") === "navigate" ||
    accept.includes("text/html");

  const looksLikeBot = ua === "" || BOT_RE.test(ua);
  if (looksLikeBot || (!isRscRequest && !isNavigation)) {
    return new NextResponse(null, {
      status: 404,
      headers: { "x-robots-tag": "noindex, nofollow" },
    });
  }

  const response = NextResponse.next();
  response.headers.set("x-robots-tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: [
    "/VA/:path*",
    "/VW/:path*",
    "/VISP/:path*",
    "/VSP/:path*",
    "/VC/:path*",
    "/VS/:path*",
    "/VKW/:path*",
    "/VP/:path*",
    "/admin/:path*",
    "/operations/:path*",
    "/dev/:path*",
    "/maintenance/:path*",
  ],
};
