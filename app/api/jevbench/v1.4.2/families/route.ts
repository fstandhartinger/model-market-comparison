import { readJevbenchV142Families, validateJevbenchV142Families } from '../../../../../lib/jevbench-v142-families.mjs';
import { readJevbenchV142 } from '../../../../../lib/jevbench-v142.mjs';

// CR-153: the aggregate-only family supplement behind the compare view's family radars, byte for byte.
export const dynamic = 'force-static';

export async function GET() {
  const { bytes, sha256, supplement } = await readJevbenchV142Families();
  validateJevbenchV142Families(supplement, (await readJevbenchV142()).artifact);
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-SHA256': sha256,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
