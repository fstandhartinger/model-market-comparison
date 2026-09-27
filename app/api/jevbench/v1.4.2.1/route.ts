import { readJevbenchV1421 } from '../../../../lib/jevbench-v1421.mjs';

// CR-179: exact aggregate-only JevBench v1.4.2.1 bytes; the reader rejects item-level data.
export const dynamic = 'force-static';

export async function GET() {
  const { bytes, sha256 } = await readJevbenchV1421();
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-SHA256': sha256,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
