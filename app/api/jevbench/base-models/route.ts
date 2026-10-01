import { BASE_MODEL_METADATA, BASE_MODEL_BENCHMARKS, baseModelsForBenchmark } from '../../../../lib/jev-base-model.mjs';

// CR-254: provenance lives separately from the exact, content-hashed result APIs.
export const dynamic = 'force-static';

export function GET() {
  return Response.json({
    schema_version: BASE_MODEL_METADATA.schema_version,
    checked_utc: BASE_MODEL_METADATA.checked_utc,
    benchmarks: Object.fromEntries(BASE_MODEL_BENCHMARKS.map((benchmark) => [benchmark, baseModelsForBenchmark(benchmark)])),
  }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
