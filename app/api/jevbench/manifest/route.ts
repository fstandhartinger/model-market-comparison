import { readDecisionBenchmarkManifest } from '../../../../lib/decision-benchmark-manifest.mjs';
export async function GET() {
  return Response.json(await readDecisionBenchmarkManifest(), { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
