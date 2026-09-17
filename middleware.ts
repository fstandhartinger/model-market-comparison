import { NextResponse, type NextRequest } from "next/server";
import { countRequest } from "./lib/visit-counter";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/api/")) {
    // CR-67.4: aggregate page counts from the request itself; see lib/visit-stats.mjs.
    countRequest(req);
    return NextResponse.next();
  }
  // Make every /api/* route a public, read-only, CORS-enabled JSON API so other
  // sites/tools can consume the data directly from the browser.
  // CR-5.1: sign-in and account routes are same-origin only — no public CORS headers there.
  // CR-67.4: so is the operator's visitor report.
  if (path.startsWith("/api/auth") || path.startsWith("/api/account") || path.startsWith("/api/operator/")) return NextResponse.next();
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
