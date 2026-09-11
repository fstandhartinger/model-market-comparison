import { getBenchmarkView } from '../../../lib/benchmark-data';
import { selectBenchmarkView } from '../../../lib/benchmark-view.mjs';
export async function GET(request: Request) {
  const url = new URL(request.url), view = await getBenchmarkView();
  const axis = url.searchParams.get('axis');
  const ids = url.searchParams.getAll('model').slice(0, 4);
  if (axis && !view.axes.some((a) => a.id === axis)) return Response.json({ error: 'Unknown benchmark cohort' }, { status: 404 });
  return Response.json(selectBenchmarkView(view, ids, axis), { headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } });
}
