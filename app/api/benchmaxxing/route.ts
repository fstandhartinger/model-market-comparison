import { getBenchmarkView } from '../../../lib/benchmark-data';
import {
  MIN_ABS_R,
  MIN_OVERLAP,
  computePairStats,
  evidencedAxisMaps,
  measuredAxisMaps,
  predictForAxis,
  predictForModel,
  scoreBenchmaxxing,
  type FitStats,
} from '../../../lib/benchmax.mjs';
import type { BenchmarkView } from '../../../lib/benchmark-view.mjs';

// Benchmaxxing predictions are computed from the same cached benchmark view used by
// the explorer. Pair statistics are rebuilt only when the underlying dataset changes.
let cache: {
  view: BenchmarkView;
  maps: Map<string, Map<string, number>>;
  evid: Map<string, Map<string, number>>;
  stats: Map<string, FitStats>;
} | null = null;

async function setup() {
  const view = await getBenchmarkView();
  if (!cache || cache.view !== view) {
    const maps = measuredAxisMaps(view);
    const evid = evidencedAxisMaps(view);
    cache = { view, maps, evid, stats: computePairStats(maps) };
  }
  return cache;
}

const POLICY = {
  minOverlap: MIN_OVERLAP,
  minAbsR: MIN_ABS_R,
  note: 'Least-squares fit over catalog models measured on both exact benchmark versions. Native units, ~95% prediction interval. Estimates are never measurements; versions are never mixed.',
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const modelId = url.searchParams.get('model');
  const reportId = url.searchParams.get('report');
  const axisId = url.searchParams.get('axis');
  const headers = { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' };
  if (!modelId && !reportId && !axisId) return Response.json({ error: 'Supply ?report=<model id>, ?model=<model id> or ?axis=<axis id>' }, { status: 400, headers });
  if ([modelId, reportId, axisId].filter(Boolean).length > 1) return Response.json({ error: 'Supply exactly one query mode' }, { status: 400, headers });
  const c = await setup();
  if (reportId) {
    const model = c.view.models.find((m) => m.id === reportId);
    if (!model) return Response.json({ error: 'Unknown model' }, { status: 404, headers });
    return Response.json({ model: { id: model.id, name: model.name, org: model.org }, report: scoreBenchmaxxing(c.view, reportId) }, { headers });
  }
  if (modelId) {
    const model = c.view.models.find((m) => m.id === modelId);
    if (!model) return Response.json({ error: 'Unknown model' }, { status: 404, headers });
    const result = predictForModel(c.view, c.maps, c.evid, c.stats, modelId, { limit: 25 });
    return Response.json({ model: { id: model.id, name: model.name, org: model.org }, policy: POLICY, predictions: result?.predictions ?? [] }, { headers });
  }
  if (!axisId) return Response.json({ error: 'Supply ?model=<model id> or ?axis=<axis id>' }, { status: 400, headers });
  const out = predictForAxis(c.view, c.maps, c.evid, c.stats, axisId, { limit: 50 });
  if (!out) return Response.json({ error: 'Unknown benchmark cohort' }, { status: 404, headers });
  return Response.json({ ...out, policy: POLICY }, { headers });
}
