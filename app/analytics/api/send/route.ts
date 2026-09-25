import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { performance } from "node:perf_hooks";
import { getDataset } from "../../../../lib/data";
import { readJevbenchV12, jevbenchV12View } from "../../../../lib/jevbench-v12.mjs";
import { readJevbenchV141, jevbenchV141View } from "../../../../lib/jevbench-v141.mjs";
import { sanitizeAnalyticsPayload } from "../../../../lib/analytics-privacy.mjs";

const UMAMI_ORIGIN = "https://bh-analytics.app.mintapis.com";
const BODY_LIMIT = 32 * 1024;
const ANALYTICS_HOSTNAMES = new Set(["benchmarkheaven.com", "www.benchmarkheaven.com"]);
const CLIENT_RATE_LIMIT = 120;
const CLIENT_RATE_WINDOW_MS = 60_000;
const CLIENT_RATE_BUCKET_LIMIT = 10_000;
const CLIENT_RATE_LIMIT_SALT = randomBytes(32);
const clientRateBuckets = new Map<string, { windowStart: number; count: number; lastSeen: number }>();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noContent() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

function trustedRequestHostname(request: Request) {
  const hostHeader = request.headers.get("host");
  if (!hostHeader || !/^(?:benchmarkheaven\.com|www\.benchmarkheaven\.com)(?::443)?$/i.test(hostHeader)) return null;

  let requestUrl: URL;
  let hostUrl: URL;
  try {
    requestUrl = new URL(request.url);
    hostUrl = new URL(`https://${hostHeader}`);
  } catch {
    return null;
  }

  const hostname = hostUrl.hostname.toLowerCase();
  const expectedOrigin = `https://${hostname}`;
  if (
    requestUrl.protocol !== "https:" ||
    !ANALYTICS_HOSTNAMES.has(hostname) ||
    hostUrl.username || hostUrl.password || hostUrl.pathname !== "/" || hostUrl.search || hostUrl.hash ||
    requestUrl.origin !== expectedOrigin
  ) return null;

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    let originUrl: URL;
    try {
      originUrl = new URL(originHeader);
    } catch {
      return null;
    }
    if (
      originUrl.protocol !== "https:" ||
      originUrl.origin !== expectedOrigin ||
      originUrl.username || originUrl.password || originUrl.pathname !== "/" || originUrl.search || originUrl.hash
    ) return null;
  } else {
    // Some same-origin browser requests omit Origin. Sec-Fetch-Site is browser-controlled;
    // if a Referer is present, require it to confirm the same HTTPS origin as well.
    if (request.headers.get("sec-fetch-site")?.toLowerCase() !== "same-origin") return null;
    const referer = request.headers.get("referer");
    if (referer) {
      let refererUrl: URL;
      try {
        refererUrl = new URL(referer);
      } catch {
        return null;
      }
      if (refererUrl.protocol !== "https:" || refererUrl.origin !== expectedOrigin) return null;
    }
  }

  return hostname;
}

async function readLimitedBody(request: Request) {
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > BODY_LIMIT || !request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) {
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

function trustedClientIp(request: Request) {
  // Coolify's Traefik ingress manages X-Real-IP. Do not trust client-supplied CF-* headers on this direct origin.
  const proxyIp = request.headers.get("x-real-ip")?.trim();
  if (proxyIp && isIP(proxyIp)) return { header: "x-real-ip", value: proxyIp };
  return null;
}

function allowClientRequest(ip: string) {
  const now = performance.now();
  // Entries are kept in last-seen order, so expired buckets can be removed from the front.
  while (true) {
    const oldest = clientRateBuckets.entries().next().value as
      | [string, { windowStart: number; count: number; lastSeen: number }]
      | undefined;
    if (!oldest || now - oldest[1].lastSeen < CLIENT_RATE_WINDOW_MS) break;
    clientRateBuckets.delete(oldest[0]);
  }

  const key = createHmac("sha256", CLIENT_RATE_LIMIT_SALT).update(ip).digest("hex");
  const bucket = clientRateBuckets.get(key);
  if (bucket) {
    if (now - bucket.windowStart >= CLIENT_RATE_WINDOW_MS) {
      bucket.windowStart = now;
      bucket.count = 1;
      bucket.lastSeen = now;
      clientRateBuckets.delete(key);
      clientRateBuckets.set(key, bucket);
      return true;
    }
    if (bucket.count >= CLIENT_RATE_LIMIT) return false;

    bucket.count += 1;
    bucket.lastSeen = now;
    clientRateBuckets.delete(key);
    clientRateBuckets.set(key, bucket);
    return true;
  }

  if (clientRateBuckets.size >= CLIENT_RATE_BUCKET_LIMIT) return false;
  clientRateBuckets.set(key, { windowStart: now, count: 1, lastSeen: now });
  return true;
}

export async function POST(request: Request) {
  const hostname = trustedRequestHostname(request);
  if (!hostname) return noContent();

  const dnt = request.headers.get("dnt")?.toLowerCase();
  if (dnt === "1" || dnt === "yes" || request.headers.get("sec-gpc") === "1") return noContent();
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return noContent();
  }

  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!websiteId || request.headers.get("content-length") === "0") return noContent();

  const ip = trustedClientIp(request);
  if (!ip || !allowClientRequest(ip.value)) return noContent();

  let text: string | null;
  try {
    text = await readLimitedBody(request);
  } catch {
    return noContent();
  }
  if (!text) return noContent();

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return noContent();
  }
  if (!body || typeof body !== "object") return noContent();

  const envelope = body as { type?: unknown; payload?: unknown };
  if (envelope.type !== "event" || !envelope.payload || typeof envelope.payload !== "object") return noContent();
  const payload = envelope.payload as Record<string, unknown>;
  if (payload.website !== websiteId || "name" in payload || "data" in payload || "id" in payload) return noContent();

  let dataSources: [
    Awaited<ReturnType<typeof getDataset>>,
    Awaited<ReturnType<typeof readJevbenchV12>>,
    Awaited<ReturnType<typeof readJevbenchV141>>,
  ];
  try {
    dataSources = await Promise.all([
      getDataset(),
      readJevbenchV12(),
      readJevbenchV141(),
    ]);
  } catch {
    return noContent();
  }
  const [dataset, v12, v141] = dataSources;
  const jev12 = jevbenchV12View(v12);
  const jevKeys = new Set([
    ...jev12.ranked.map((row) => row.key),
    ...jev12.honorable.map((row) => row.key),
    ...jev12.partial.map((row) => row.key),
    ...jevbenchV141View(v141).systems.map((row) => row.key),
  ]);
  const safe = sanitizeAnalyticsPayload(payload, {
    origin: `https://${hostname}`,
    fallbackUrl: "/",
    modelIds: new Set(dataset.models.map((model) => model.id)),
    modelFamilyIds: new Set(dataset.models.map((model) => model.family_key)),
    jevSystemIds: jevKeys,
  });
  if (!safe) return noContent();

  const safePayload = {
    website: websiteId,
    hostname,
    url: safe.url,
    referrer: safe.referrer,
  };
  const headers = new Headers({ "content-type": "application/json", accept: "application/json" });
  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent.slice(0, 512));

  headers.set(ip.header, ip.value);

  const cacheToken = request.headers.get("x-umami-cache");
  if (cacheToken && cacheToken.length <= 4096 && /^[A-Za-z0-9._~-]+$/.test(cacheToken)) {
    headers.set("x-umami-cache", cacheToken);
  }

  try {
    const upstream = await fetch(`${UMAMI_ORIGIN}/api/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "event", payload: safePayload }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return noContent();

    let result: unknown;
    try { result = await upstream.json(); } catch { return noContent(); }
    const response: { cache?: string; disabled?: boolean } = {};
    if (result && typeof result === "object") {
      const data = result as Record<string, unknown>;
      if (typeof data.cache === "string" && data.cache.length <= 4096) response.cache = data.cache;
      if (typeof data.disabled === "boolean") response.disabled = data.disabled;
    }
    return Response.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return noContent();
  }
}
