import { isPageDataKey, pageDataBody } from "../../../../lib/page-data";

/** CR-62.1: the catalog pages' client props, fetched after the server-rendered shell (see lib/page-data.ts). */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isPageDataKey(key)) return Response.json({ error: "Unknown page data key." }, { status: 404 });
  const { version, body } = await pageDataBody(key);
  const requested = new URL(request.url).searchParams.get("v");
  // A URL carrying the current dataset version never changes, so browsers may keep it; any other URL
  // (no version, or a stale page asking for an older one) gets the current data and a short lifetime.
  const cache = requested === version ? "public, max-age=86400, stale-while-revalidate=604800" : "public, max-age=60";
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache, "X-Dataset-Version": version } });
}
