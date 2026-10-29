import { readJevAllDataProps } from '../../../../lib/jevbench-alldata-props';

export async function GET(_request: Request, { params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const props = await readJevAllDataProps(version);
  if (!props) return new Response('Not found', { status: 404 });
  return Response.json(props, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
