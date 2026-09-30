import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Aggregate-only, unlinked release preview. The public ranking remains unchanged.
export const dynamic = 'force-static';

export async function GET() {
  const html = await readFile(path.join(process.cwd(), 'data/previews/imagejev-v02.html'), 'utf8');
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Cache-Control': 'no-store',
    },
  });
}
