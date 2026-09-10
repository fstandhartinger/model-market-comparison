import { NextResponse } from "next/server";
import { getDataset } from "../../../lib/data";
export const dynamic = "force-dynamic";
export async function GET() {
  const { benchmark_results: results } = await getDataset();
  return NextResponse.json({ schema_version: results.schema_version,
    benchmarks: results.registry.map((entry) => ({ ...entry,
      coverage: results.coverage.by_benchmark[entry.id],
      collection: results.collections.find((c) => c.benchmark_id === entry.id) })),
    coverage_note: results.coverage.note });
}
