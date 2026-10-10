import { readApiFullAddenda } from '../../../../lib/jevbench-api-full-addenda.mjs';

/** Separate published aggregates; the frozen v1.6.1 feed is never amended here. */
export async function GET() {
  const registry = await readApiFullAddenda();
  return Response.json(registry, { headers: { 'Cache-Control': 'public, max-age=300', 'Content-Disposition': 'inline; filename="jevbench-api-full-addenda.json"' } });
}
