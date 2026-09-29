import { readJevbenchV153Release } from '../../../../lib/jevbench-v15-release.mjs';

// Exact aggregate-only JevBench v1.5.3 result bytes with a content hash for independent verification.
export const dynamic = 'force-static';

export async function GET() {
  const { bytes, sha256 } = await readJevbenchV153Release();
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-SHA256': sha256,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
