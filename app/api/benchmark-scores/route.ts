import { NextResponse } from "next/server";
import { getDataset } from "../../../lib/data";
import { benchmarkCell } from "../../../lib/benchmark-scores.mjs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const benchmarkId = q.get("benchmark_id"), modelId = q.get("model_id"), basis = q.get("basis");
  const offset = Number(q.get("offset") ?? 0), limit = Number(q.get("limit") ?? 100);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 500
      || basis !== null && !["measured", "self_reported", "derived"].includes(basis)) return NextResponse.json({ error: "Invalid pagination or basis; limit must be 1–500" }, { status: 400 });
  const dataset = await getDataset(), r = dataset.benchmark_results;
  if (benchmarkId && !r.registry.some((e) => e.id === benchmarkId)) return NextResponse.json({ error: "Unknown benchmark version; use a complete registry id" }, { status: 404 });
  if (modelId && !dataset.models.some((m) => m.id === modelId)) return NextResponse.json({ error: "Unknown exact model id" }, { status: 404 });
  const scores = r.observations.filter((o) => (!benchmarkId || o.benchmark_id === benchmarkId) && (!modelId || o.subject.model_id === modelId) && (!basis || o.basis === basis));
  return NextResponse.json({ schema_version: 1, total: scores.length, offset, limit, observations: scores.slice(offset, offset + limit),
    divergences: r.divergences.filter((d) => (!benchmarkId || d.benchmark_id === benchmarkId) && (!modelId || d.model_id === modelId)),
    cell: modelId && benchmarkId ? benchmarkCell(r, modelId, benchmarkId) : null,
    coverage: { model: modelId ? r.coverage.by_model[modelId] : null, benchmark: benchmarkId ? r.coverage.by_benchmark[benchmarkId] : null },
    collection: benchmarkId ? r.collections.find((c) => c.benchmark_id === benchmarkId) : null,
    coverage_note: r.coverage.note });
}
