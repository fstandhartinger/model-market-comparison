import { NextResponse } from "next/server";
import { getDataset } from "../../../lib/data";
import { revisionFromEnvironment } from "../../../lib/runtime-status.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const ds = await getDataset();
  const revision = revisionFromEnvironment();
  return NextResponse.json({
    generated_at: ds.generated_at,
    counts: ds.counts,
    sources: ds.sources,
    source: (ds as { _source?: string })._source || "bundled",
    revision,
  }, { headers: { 'X-Benchmark-Heaven-Revision': revision } });
}
