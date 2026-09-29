import { publicOrigin } from "../../../lib/account-sync.mjs";

const UMAMI_ORIGIN = "https://bh-analytics.app.mintapis.com";
const EVENTS = new Set(["fastlane_banner_view", "fastlane_banner_click", "fastlane_banner_dismiss"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noContent() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

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
      if (size > 256) {
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
  // Next.js sees its internal localhost URL behind Coolify. The ingress-provided
  // host is the public origin, as in the site's existing checkout CSRF guard.
  const origin = publicOrigin(request.headers);
  if (!origin || request.headers.get("origin") !== origin) return noContent();
  const hostname = new URL(origin).hostname;
  if (["1", "yes"].includes(request.headers.get("dnt") || "") || request.headers.get("sec-gpc") === "1") return noContent();
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return noContent();
  if (Number(request.headers.get("content-length") || 0) > 256) return noContent();

  let payload: { name?: unknown; page?: unknown };
  try {
    const body = await readSmallBody(request);
    if (!body) return noContent();
    payload = JSON.parse(body);
  } catch {
    return noContent();
  }
  if (!payload || !EVENTS.has(payload.name as string)) return noContent();
  if (payload.page !== "jev-models" && payload.page !== "image-jev-bench") return noContent();

  const website = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!website) return noContent();
  const userAgent = request.headers.get("user-agent") || "Mozilla/5.0";
  try {
    await fetch(`${UMAMI_ORIGIN}/api/send`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": userAgent.slice(0, 512) },
      body: JSON.stringify({
        type: "event",
        payload: {
          website,
          hostname,
          url: `/${payload.page}`,
          name: payload.name,
        },
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Analytics must never interrupt navigation or dismissing the banner.
  }
  return noContent();
}
