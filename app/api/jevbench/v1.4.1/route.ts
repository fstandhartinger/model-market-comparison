import { readJevbenchV141 } from '../../../../lib/jevbench-v141.mjs';

// CR-135: exact aggregate-only JevBench v1.4.1 bytes; the reader rejects item-level data.
export const dynamic = 'force-static';

export async function GET() {
  const { bytes, sha256 } = await readJevbenchV141();
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-SHA256': sha256,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
