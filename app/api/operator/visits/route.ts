import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { readVisitReport, visitStatsConfigured } from "../../../../lib/visit-counter";

// CR-67.4: aggregate visitor statistics for the operator only (Bearer VISIT_STATS_TOKEN). Returns daily
// totals, top pages and top referring hosts — there is no visitor-level data to return.
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
const digest = (s: string) => createHash("sha256").update(s).digest();

export async function GET(req: NextRequest) {
  const token = process.env.VISIT_STATS_TOKEN;
  if (!token || token.length < 32 || !visitStatsConfigured()) return json({ error: "Not found" }, 404);
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!given || !timingSafeEqual(digest(given), digest(token))) return json({ error: "Unauthorized" }, 401);
  const days = Number(req.nextUrl.searchParams.get("days") ?? 30);
  try {
    return json(await readVisitReport(days));
  } catch {
    return json({ error: "Statistics unavailable" }, 503);
  }
}
