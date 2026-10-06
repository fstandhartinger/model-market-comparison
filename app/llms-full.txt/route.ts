import { jevbenchLlmsFull } from '../../lib/jevbench-llms-full.mjs';
export const dynamic = 'force-static';
export const revalidate = 300;
export async function GET() {
  return new Response(await jevbenchLlmsFull(), {headers: {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
