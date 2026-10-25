import { readJevbenchV175ForBoard } from '../../../../lib/jevbench-v175-release.mjs';
export const dynamic = 'force-static';
export async function GET() {
  const release = await readJevbenchV175ForBoard();
  if (!release) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(release.bytes), { headers: {
    'Content-Type': 'application/json; charset=utf-8', 'X-Content-SHA256': release.sha256,
    'Cache-Control': 'public, max-age=3600',
  } });
}
