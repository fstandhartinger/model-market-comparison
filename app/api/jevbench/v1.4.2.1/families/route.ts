import { readJevbenchV1421Families, validateJevbenchV1421Families } from '../../../../../lib/jevbench-v1421-families.mjs';
import { readJevbenchV1421 } from '../../../../../lib/jevbench-v1421.mjs';

// CR-179: the aggregate-only v1.4.2.1 family supplement behind the compare view's family radars, byte for byte.
export const dynamic = 'force-static';

export async function GET() {
  const { bytes, sha256, supplement } = await readJevbenchV1421Families();
  validateJevbenchV1421Families(supplement, (await readJevbenchV1421()).artifact);
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-SHA256': sha256,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
