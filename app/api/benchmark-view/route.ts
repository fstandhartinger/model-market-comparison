import { getBenchmarkView } from '../../../lib/benchmark-data';
import { selectBenchmarkView, selectFamilyBenchmarkView } from '../../../lib/benchmark-view.mjs';
export async function GET(request: Request) {
  const url = new URL(request.url), view = await getBenchmarkView();
  const axis = url.searchParams.get('axis');
  const ids = url.searchParams.getAll('model').slice(0, 4);
  if (axis && !view.axes.some((a) => a.id === axis)) return Response.json({ error: 'Unknown benchmark cohort' }, { status: 404 });
  // CR-36.2: Compare asks for one entry per model (best of its reasoning variants).
  const select = url.searchParams.get('collapse') === '1' ? selectFamilyBenchmarkView : selectBenchmarkView;
  return Response.json(select(view, ids, axis), { headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } });
}
