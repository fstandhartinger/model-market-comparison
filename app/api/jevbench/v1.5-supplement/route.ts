import { readHistoricalJevbenchSupplement } from '../../../../lib/jevbench-history-supplement.mjs';
export const dynamic = 'force-static';
export async function GET() {
  const { bytes, sha256 } = await readHistoricalJevbenchSupplement();
  return new Response(new Uint8Array(bytes), { headers: {
    'Content-Type': 'application/json; charset=utf-8', 'X-Content-SHA256': sha256, 'Cache-Control': 'public, max-age=3600',
  } });
}
