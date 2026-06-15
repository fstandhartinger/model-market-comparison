import { NextResponse } from "next/server";
import { getDataset } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const ds = await getDataset();
  return NextResponse.json({
    generated_at: ds.generated_at,
    counts: ds.counts,
    sources: ds.sources,
    source: (ds as { _source?: string })._source || "bundled",
  });
}
