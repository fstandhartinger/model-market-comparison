import { NextRequest, NextResponse } from "next/server";
import { authConfigured, handlers } from "../../../../auth";
import { publicOrigin } from "../../../../lib/account-sync.mjs";

export const dynamic = "force-dynamic";

const disabled = () => NextResponse.json({ error: "Accounts are not enabled" }, { status: 404, headers: { "Cache-Control": "no-store" } });

// Behind the proxy the request URL carries the container's localhost origin; Auth.js builds the Google
// callback from it. Re-root the request on the visitor's host (allowlisted), as next-auth does for AUTH_URL.
function withPublicOrigin(req: NextRequest): NextRequest {
  const origin = publicOrigin(req.headers);
  const { href, origin: seen } = req.nextUrl;
  return origin && origin !== seen ? new NextRequest(href.replace(seen, origin), req) : req;
}

export const GET = (req: NextRequest) => (authConfigured() ? handlers.GET(withPublicOrigin(req)) : disabled());
export const POST = (req: NextRequest) => (authConfigured() ? handlers.POST(withPublicOrigin(req)) : disabled());
