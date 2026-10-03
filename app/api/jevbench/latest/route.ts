import { readJevbenchAgentFeed } from '../../../../lib/jevbench-agent-feed.mjs';

export const dynamic = 'force-static';

export async function GET() {
  const { bytes, sha256 } = await readJevbenchAgentFeed();
  return new Response(bytes, { headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'X-Content-SHA256',
    'X-Content-SHA256': sha256,
  } });
}
