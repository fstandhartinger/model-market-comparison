import { decisionResults, resultsCsv } from '../../../../../../lib/decision-result-export.mjs';

export async function GET(_request: Request, { params }: { params: Promise<{ benchmark: string; version: string; format: string }> }) {
  const { benchmark, version, format } = await params;
  if (!['json', 'csv'].includes(format)) return new Response('Not found', { status: 404 });
  const result = await decisionResults(benchmark, version);
  if (!result) return new Response('Published release not found', { status: 404 });
  return new Response(format === 'json' ? JSON.stringify(result) + '\n' : resultsCsv(result), { headers: {
    'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${benchmark}-${version}.${format}"`,
    'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*',
  } });
}
