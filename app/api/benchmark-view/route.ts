import { getBenchmarkView } from '../../../lib/benchmark-data';
import { selectBenchmarkView, selectFamilyBenchmarkView } from '../../../lib/benchmark-view.mjs';
import { withRadarPercentiles } from '../../../lib/radar.mjs';
export async function GET(request: Request) {
  const url = new URL(request.url), view = await getBenchmarkView();
  const axis = url.searchParams.get('axis');
  const ids = url.searchParams.getAll('model').slice(0, 4);
  if (axis && !view.axes.some((a) => a.id === axis)) return Response.json({ error: 'Unknown benchmark cohort' }, { status: 404 });
  // CR-36.2: Compare asks for one entry per model (best of its reasoning variants).
  const select = url.searchParams.get('collapse') === '1' ? selectFamilyBenchmarkView : selectBenchmarkView;
  // F-107: the radar's percentile positions are taken over the whole catalog, not over the returned rows.
  return Response.json(withRadarPercentiles(select(view, ids, axis), view), { headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } });
}
