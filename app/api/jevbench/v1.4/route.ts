import { readJevbenchV14 } from '../../../../lib/jevbench-v14.mjs';

// CR-131: byte-for-byte public JevBench v1.4 aggregates; the reader rejects item-level data.
export const dynamic = 'force-static';

export async function GET() {
  const { bytes, sha256 } = await readJevbenchV14();
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-SHA256': sha256,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
