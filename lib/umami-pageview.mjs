// CR-177.1: page views in our self-hosted Umami. Decision record: ops/ux-2026-09-12/CR-67.5-CONSENT-DECISION.md §7.
//
// Why this file exists: Umami reported 0 page views for weeks while the fast-lane banner's counters worked.
// Nothing in this repository ever sent a page view. Umami's collect endpoint decides by the presence of a
// `name` in the payload: with a name the hit is an event, without one it is a page view. CR-167's relay
// (app/api/fastlane-banner-event/route.ts) always sends a name, so every forward became an event.
//
// Two paths reach Umami from here, both server-to-server from our own host, and neither writes to or reads
// from the visitor's device:
//   1. Full page loads — `middleware.ts` forwards the request it is answering anyway. No client code at all.
//   2. In-app (client-router) navigations — the browser posts the path to our own /api/page-view, because
//      Next.js strips the RSC and prefetch headers before middleware (node_modules/next/dist/server/web/
//      adapter.js: "Headers should only be stripped for middleware"), so the server cannot tell an in-app
//      navigation from a prefetch. Without this second path SPA navigations cannot be counted at all.
//
// What Umami receives per hit: our website id, the public hostname, and route path from the same allow-list
// the first-party counter uses. The trusted ingress IP and the real UA are sent as headers only; Umami
// creates its own daily-salted anonymous session hash. No query string, referrer, client cookie or body id.
// Requests carrying GPC/DNT, prefetches, bots and unknown routes are dropped before anything is sent.
import { PUBLIC_HOSTS, publicOrigin } from "./account-sync.mjs";
import { classifyRequest, normalisePath, UNKNOWN_ROUTE } from "./visit-stats.mjs";

export const UMAMI_ORIGIN = "https://bh-analytics.app.mintapis.com";

const HOSTS = new Set(PUBLIC_HOSTS);
const CLIENT_IP_HEADER = "x-bh-client-ip";
const MAX_USER_AGENT_LENGTH = 512;

/** Bounded outbound load: a crawl burst or a load test can never turn into an unbounded fan-out of forwards. */
export const MAX_FORWARDS_PER_MINUTE = 600;

const bucket = { minute: -1, used: 0 };

/** @returns true while this process is under the forward budget for the current minute. */
export function allowForward(now = Date.now(), state = bucket, max = MAX_FORWARDS_PER_MINUTE) {
  const minute = Math.floor(now / 60_000);
  if (state.minute !== minute) { state.minute = minute; state.used = 0; }
  if (state.used >= max) return false;
  state.used += 1;
  return true;
}

const dnt = (headers) => ["1", "yes"].includes(headers.get("dnt") || "") || headers.get("sec-gpc") === "1";

function validIpv4(address) {
  const parts = address.split(".");
  return parts.length === 4 && parts.every((part) => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
}

/** Strict IP syntax check. Avoid a Node-only dependency because middleware may run in Next's Edge runtime. */
function validIp(address) {
  if (typeof address !== "string" || !address || address.length > 45 || /[%\[\],\s]/.test(address)) return false;
  if (address.includes(".")) {
    const split = address.lastIndexOf(":");
    const ipv4 = split < 0 ? address : address.slice(split + 1);
    if (!validIpv4(ipv4)) return false;
    if (split < 0) return true;
    address = `${address.slice(0, split)}:v4tail`;
  }
  if (!address.includes(":")) return validIpv4(address);
  if (address.includes(":::") || (address.match(/::/g) || []).length > 1) return false;
  const compressed = address.includes("::");
  if (!compressed && (address.startsWith(":") || address.endsWith(":"))) return false;
  const parts = compressed
    ? address.split("::").flatMap((side) => side ? side.split(":") : [])
    : address.split(":");
  if (!parts.every((part) => /^(?:[0-9a-f]{1,4}|v4tail)$/i.test(part))) return false;
  const count = parts.reduce((sum, part) => sum + (part === "v4tail" ? 2 : 1), 0);
  return compressed ? count < 8 : count === 8;
}

/** Extract only the single-IP header set by our Traefik ingress and the real bounded browser UA. */
export function clientIdentity(headers) {
  const clientIp = headers.get("x-real-ip")?.trim();
  const userAgent = headers.get("user-agent")?.trim();
  if (!validIp(clientIp) || !userAgent || userAgent.length > MAX_USER_AGENT_LENGTH || /[\u0000-\u001f\u007f]/.test(userAgent)) return null;
  return { clientIp, userAgent };
}

function validIdentity(identity) {
  return identity && validIp(identity.clientIp) && typeof identity.userAgent === "string"
    && identity.userAgent.length > 0 && identity.userAgent.length <= MAX_USER_AGENT_LENGTH
    && !/[\u0000-\u001f\u007f]/.test(identity.userAgent);
}

/**
 * A full page load that should be counted as a page view.
 * Reuses the first-party counter's classification (GET, document, not a prefetch, not a bot, GPC/DNT
 * honoured, known route) so the two mechanisms can never disagree about what a page view is.
 * @param {{ method: string, url: string, headers: { get(name: string): string | null } }} req
 * @returns {{ hostname: string, url: string } | null}
 */
export function documentPageview(req) {
  const origin = publicOrigin(req.headers);
  if (!origin) return null;
  const hit = classifyRequest(req);
  if (!hit || hit.path === UNKNOWN_ROUTE) return null;
  return { hostname: new URL(origin).hostname, url: hit.path };
}

/**
 * An in-app navigation reported by /api/page-view. Same-origin only, same allow-list, nothing from the body
 * but the path — and the path is re-derived, so a caller cannot put its own string into Umami.
 * @param {{ get(name: string): string | null }} headers
 * @param {unknown} path
 * @returns {{ hostname: string, url: string } | null}
 */
export function navigationPageview(headers, path) {
  const origin = publicOrigin(headers);
  if (!origin || headers.get("origin") !== origin) return null;
  const hostname = new URL(origin).hostname;
  if (!HOSTS.has(hostname)) return null;
  if (dnt(headers)) return null;
  const ua = headers.get("user-agent") || "";
  if (!ua || /bot|crawl|spider|headless|playwright|puppeteer|selenium|curl|wget|python/i.test(ua)) return null;
  if (typeof path !== "string" || path.length > 512) return null;
  const url = normalisePath(path.split("?")[0].split("#")[0]);
  if (!url || url === UNKNOWN_ROUTE) return null;
  return { hostname, url };
}

/** The exact body sent to Umami — no name (that is what makes it a page view, not an event). */
export function pageviewPayload({ hostname, url }, website) {
  return { type: "event", payload: { website, hostname, url } };
}

/**
 * Forward one page view. Never throws, never blocks a page: analytics must not be able to break the site.
 * @param {{ hostname: string, url: string } | null} hit
 * @param {{ website?: string, identity?: { clientIp: string, userAgent: string } | null, fetchImpl?: typeof fetch, now?: number }} options
 * @returns {Promise<boolean>} true when a forward was sent (not whether Umami stored it).
 */
export async function sendPageview(hit, { website = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID, identity, fetchImpl = fetch, now = Date.now() } = {}) {
  if (!hit || !website || !validIdentity(identity)) return false;
  if (!allowForward(now)) return false;
  try {
    await fetchImpl(`${UMAMI_ORIGIN}/api/send`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": identity.userAgent, [CLIENT_IP_HEADER]: identity.clientIp },
      body: JSON.stringify(pageviewPayload(hit, website)),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    return true;
  } catch {
    return false;
  }
}
