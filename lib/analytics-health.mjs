// CR-177.2: the daily sanity check behind CR-177.1. Page-view tracking was broken for days without anyone
// noticing, because the custom events kept arriving and nobody compares the two numbers. This module holds
// that comparison as a pure rule plus one reader, so the daily gate can put a line in the digest.
//
// Keep the two known failures visible: events without page views (the CR-177 outage) and page views without
// more than one visitor (the shared-identity collapse found in CR-178). Page views without events are normal —
// nobody has to press the banner.

/** The window the daily check looks at. A full day, so a few quiet hours never raise an alert. */
export const CHECK_DAYS = 1;

/**
 * @param {{ pageviews: number, visitors: number, events: number, days?: number }} counts
 * @returns {{ level: 'ok' | 'alert', text: string } } one line for the digest.
 */
export function analyticsHealth({ pageviews, visitors, events, days = CHECK_DAYS }) {
  const window = days === 1 ? "24 h" : `${days} d`;
  const pv = Number(pageviews);
  const vis = Number(visitors);
  const ev = Number(events);
  if (!Number.isFinite(pv) || !Number.isFinite(vis) || !Number.isFinite(ev)) {
    return { level: 'alert', text: `Analytics: page-view/visitor check could not read Umami (no usable counts) — CR-177.2/CR-178.3.` };
  }
  if (pv === 0 && ev > 0) {
    return {
      level: 'alert',
      text: `Analytics: 0 page views in Umami over ${window} while ${ev.toLocaleString('en-US')} banner events arrived — page-view tracking is broken again (CR-177.1: lib/umami-pageview.mjs, middleware.ts, /api/page-view).`,
    };
  }
  if (pv === 0 && ev === 0) {
    return { level: 'alert', text: `Analytics: no page views and no events in Umami over ${window} — the site is either unreachable for the collector or nothing is being forwarded (CR-177).` };
  }
  if (pv > 0 && vis <= 1) {
    return { level: 'alert', text: `Analytics: ${pv.toLocaleString('en-US')} page views but only ${vis.toLocaleString('en-US')} visitor(s) over ${window}, with ${ev.toLocaleString('en-US')} events — visitor/session identity may be collapsing (CR-178.1).` };
  }
  return { level: 'ok', text: `Analytics: ${pv.toLocaleString('en-US')} page views, ${vis.toLocaleString('en-US')} visitors, ${ev.toLocaleString('en-US')} events over ${window}.` };
}

/** True when the check can run at all; unconfigured is not a failure (local runs, forks). */
export const analyticsCheckConfigured = (env = process.env) =>
  Boolean(env.UMAMI_BASE_URL && env.UMAMI_WEBSITE_ID && env.UMAMI_API_KEY);

/**
 * Read page views and visitors from the stats endpoint plus custom events from the metrics endpoint.
 * Bearer auth: the self-hosted v3 instance answers 401 to `x-umami-api-key`.
 * @returns {Promise<{ pageviews: number, visitors: number, events: number, days: number }>}
 */
export async function readAnalyticsCounts({ env = process.env, days = CHECK_DAYS, fetchImpl = fetch, now = Date.now() } = {}) {
  const base = String(env.UMAMI_BASE_URL).replace(/\/$/, '');
  const site = env.UMAMI_WEBSITE_ID;
  const headers = { authorization: `Bearer ${env.UMAMI_API_KEY}` };
  const range = `startAt=${now - days * 86_400_000}&endAt=${now}`;
  const get = async (path) => {
    const res = await fetchImpl(`${base}${path}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`Umami ${path.split('?')[0]} answered HTTP ${res.status}`);
    return res.json();
  };
  const [stats, events] = await Promise.all([
    get(`/api/websites/${site}/stats?${range}`),
    get(`/api/websites/${site}/metrics?${range}&type=event`),
  ]);
  // v3 returns plain numbers; earlier versions wrapped them as { value }.
  const pageviews = typeof stats?.pageviews === 'object' ? Number(stats?.pageviews?.value) : Number(stats?.pageviews);
  const visitors = typeof stats?.visitors === 'object' ? Number(stats?.visitors?.value) : Number(stats?.visitors);
  const eventCount = Array.isArray(events) ? events.reduce((sum, row) => sum + (Number(row?.y) || 0), 0) : NaN;
  return { pageviews, visitors, events: eventCount, days };
}

/** The whole check: read, then judge. Never throws; an unreadable Umami is itself an alert. */
export async function checkAnalyticsHealth(options = {}) {
  const env = options.env ?? process.env;
  if (!analyticsCheckConfigured(env)) return { level: 'skip', text: 'Analytics: page-view check not configured (no Umami credentials).' };
  try {
    const counts = await readAnalyticsCounts({ ...options, env });
    return { ...analyticsHealth(counts), counts };
  } catch (error) {
    return { level: 'alert', text: `Analytics: page-view check could not read Umami (${error.message}) — CR-177.2.` };
  }
}
