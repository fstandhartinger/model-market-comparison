import { navigationPageview, sendPageview } from "../../../lib/umami-pageview.mjs";

// CR-177.1: in-app navigations. A full page load is counted by `middleware.ts` without any client code;
// Next.js strips the RSC/prefetch headers before middleware, so a client-router navigation is invisible to
// the server and this is the only way to count it. The browser posts `{ path }` to our own origin and this
// route forwards a page view to our self-hosted Umami on the same machine — the browser never contacts it.
// Decision record: ops/ux-2026-09-12/CR-67.5-CONSENT-DECISION.md §7. The route reads no cookie, touches no
// database, stores nothing, and always answers 204 so analytics can never interrupt a navigation.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

async function readSmallBody(request: Request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 512) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return noContent();
  if (Number(request.headers.get("content-length") || 0) > 512) return noContent();
  let payload: { path?: unknown };
  try {
    const body = await readSmallBody(request);
    if (!body) return noContent();
    payload = JSON.parse(body);
  } catch {
    return noContent();
  }
  // The path is re-derived from the allow-list of known routes, so nothing a caller writes reaches Umami
  // verbatim, and a request with GPC/DNT, a bot agent or a foreign Origin is dropped here.
  const hit = navigationPageview(request.headers, payload?.path);
  if (hit) await sendPageview(hit);
  return noContent();
}
