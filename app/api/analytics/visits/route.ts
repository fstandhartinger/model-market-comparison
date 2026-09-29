import { NextResponse } from "next/server";
import { fetchVisitorTotal } from "../../../../lib/umami-public-counter.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
  "X-Robots-Tag": "noindex",
};

export async function GET() {
  try {
    const visits = await fetchVisitorTotal({ apiKey: process.env.UMAMI_API_KEY });
    return NextResponse.json({ visits }, { headers });
  } catch {
    return NextResponse.json({ error: "Visitor count unavailable" }, { status: 503, headers: { ...headers, "Cache-Control": "no-store" } });
  }
}
