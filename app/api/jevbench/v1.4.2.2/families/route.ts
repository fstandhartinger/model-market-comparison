import { readJevbenchV1422Families, validateJevbenchV1422Families } from '../../../../../lib/jevbench-v1422-families.mjs';
import { readJevbenchV1422 } from '../../../../../lib/jevbench-v1422.mjs';

// CR-191: the aggregate-only v1.4.2.2 family supplement behind the compare view's family radars, byte for byte.
export const dynamic = 'force-static';

export async function GET() {
  const { bytes, sha256, supplement } = await readJevbenchV1422Families();
  validateJevbenchV1422Families(supplement, (await readJevbenchV1422()).artifact);
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-SHA256': sha256,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
