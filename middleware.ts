import { NextResponse } from "next/server";

// Make every /api/* route a public, read-only, CORS-enabled JSON API so other
// sites/tools can consume the data directly from the browser.
export function middleware(req: Request) {
  // CR-5.1: sign-in and account routes are same-origin only — no public CORS headers there.
  const path = new URL(req.url).pathname;
  if (path.startsWith("/api/auth") || path.startsWith("/api/account")) return NextResponse.next();
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

export const config = { matcher: "/api/:path*" };
