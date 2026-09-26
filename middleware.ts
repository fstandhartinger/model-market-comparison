import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { countRequest } from "./lib/visit-counter";
import { documentPageview, sendPageview } from "./lib/umami-pageview.mjs";

export function middleware(req: NextRequest, event?: NextFetchEvent) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/api/")) {
    // CR-67.4: aggregate page counts from the request itself; see lib/visit-stats.mjs.
    try { countRequest(req); } catch { /* statistics must never break a page */ }
    // CR-177.1: the same page load, forwarded once to our own Umami so it has page views at all. No client
    // code, nothing read from the device; see lib/umami-pageview.mjs. waitUntil keeps the forward alive after
    // the response without delaying it; it can never reject.
    try {
      const hit = documentPageview(req);
      if (hit) {
        const forward = sendPageview(hit);
        if (typeof event?.waitUntil === "function") event.waitUntil(forward);
      }
    } catch { /* statistics must never break a page */ }
    return NextResponse.next();
  }
  // Make every /api/* route a public, read-only, CORS-enabled JSON API so other
  // sites/tools can consume the data directly from the browser.
  // CR-5.1: sign-in and account routes are same-origin only — no public CORS headers there.
  // CR-67.4: so is the operator's visitor report.
  // CR-177.1: and so is the page-view report — it is a same-origin write, not public data.
  if (path.startsWith("/api/auth") || path.startsWith("/api/account") || path.startsWith("/api/operator/")
    || path === "/api/page-view") return NextResponse.next();
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS });
  }
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Node runtime: the visit counter keeps daily totals in process memory and writes them with pg.
export const config = {
  matcher: ["/api/:path*", "/((?!_next/|api/|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|txt|xml|webmanifest|js|css|map|woff2?|json|pdf)$).*)"],
  runtime: "nodejs",
};
