// Acceptance for CR-177.1 (page views reach our self-hosted Umami) on one host.
// Usage: node verify-cr-177-live.mjs <base> <outdir>
// Credentials come from the environment or /home/flori/.config/bh-analytics/daily-digest.env (mode 600) and
// are never printed or written to evidence: UMAMI_BASE_URL, UMAMI_WEBSITE_ID, UMAMI_API_KEY.
//
// Live traffic is counted at the same time as this run, so every negative check ("adds nothing") uses a
// marker path of its own — /models/bh-cr177-<run>-… — and asks Umami for that path only. The three paths the
// brief names (/, /jev-models, /image-jev-bench) are checked as "rose by at least the loads we made", the
// only honest comparison on a page real visitors are opening meanwhile.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/cr177-verify';
const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const UMAMI_HOST = 'bh-analytics.app.mintapis.com';
const RUN = `${Date.now().toString(36)}`;
// Dry-run helpers for a local `next start` behind no ingress: BH_EXTRA_HEADERS='{"x-forwarded-host":"benchmarkheaven.com"}'
// and BH_ORIGIN=https://benchmarkheaven.com. Unset on a real host, where both are what the ingress provides.
const EXTRA = JSON.parse(process.env.BH_EXTRA_HEADERS || '{}');
const marker = (name) => `/models/bh-cr177-${RUN}-${name}`;

await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };

// ── credentials ───────────────────────────────────────────────────────────────────────────────
const envFile = await fs.readFile('/home/flori/.config/bh-analytics/daily-digest.env', 'utf8').catch(() => '');
const fromFile = Object.fromEntries([...envFile.matchAll(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/gm)]
  .map(([, k, v]) => [k, v.trim().replace(/^(['"])(.*)\1$/, '$2')]));
const env = { ...fromFile, ...process.env };
const UMAMI = String(env.UMAMI_BASE_URL || '').replace(/\/$/, '');
const SITE = env.UMAMI_WEBSITE_ID;
const KEY = env.UMAMI_API_KEY;
if (!UMAMI || !SITE || !KEY) { console.error('Umami credentials missing (UMAMI_BASE_URL/UMAMI_WEBSITE_ID/UMAMI_API_KEY)'); process.exit(3); }

const api = async (path) => {
  const res = await fetch(`${UMAMI}${path}`, { headers: { authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path.split('?')[0]}`);
  return res.json();
};
const window = (fromMs) => `startAt=${fromMs}&endAt=${Date.now() + 60_000}`;
const stats = async (fromMs) => await api(`/api/websites/${SITE}/stats?${window(fromMs)}`);
/** Umami v3 spells the page dimension `path`; `type=url` answers 400. */
const paths = async (fromMs) => await api(`/api/websites/${SITE}/metrics?${window(fromMs)}&type=path`);
const countOf = (rows, path) => Number(rows.find((r) => r.x === path)?.y || 0);
const pv = (s) => (typeof s?.pageviews === 'object' ? Number(s?.pageviews?.value) : Number(s?.pageviews));

// ── 0. the defect this CR is about: are page views arriving at all? ────────────────────────────
const dayAgo = Date.now() - 86_400_000;
const before = await stats(dayAgo).catch((e) => ({ error: e.message }));
check('Umami answers the stats API', Number.isFinite(pv(before)), `pageviews(24h)=${pv(before)}`);

const t0 = Date.now() - 2_000;
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const thirdParty = [];
const navPosts = [];

async function fresh(extraHTTPHeaders = {}) {
  const context = await browser.newContext({ userAgent: CHROME, viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { ...EXTRA, ...extraHTTPHeaders } });
  context.on('request', (req) => {
    const url = req.url();
    if (url.includes(UMAMI_HOST)) thirdParty.push(url);
    if (url.includes('/api/page-view')) navPosts.push({ url, method: req.method(), body: req.postData() });
  });
  return context;
}

// ── 1. the three named pages, as a normal visitor ──────────────────────────────────────────────
const NAMED = ['/', '/jev-models', '/image-jev-bench'];
{
  const context = await fresh();
  const page = await context.newPage();
  for (const path of NAMED) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      .catch(async () => page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 }));
    check(`${path} answers 200`, res?.status() === 200, `status=${res?.status()}`);
  }
  await context.close();
}

// ── 2. a marker page load: exactly one page view, no live traffic can touch it ─────────────────
{
  const context = await fresh();
  const page = await context.newPage();
  await page.goto(`${BASE}${marker('doc')}`, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
  await context.close();
}

// ── 3. GPC and DNT: the same load must add nothing ─────────────────────────────────────────────
for (const [name, headers] of [['gpc', { 'sec-gpc': '1' }], ['dnt', { dnt: '1' }]]) {
  const context = await fresh(headers);
  const page = await context.newPage();
  await page.goto(`${BASE}${marker(name)}`, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
  await context.close();
}

// ── 4. an in-app navigation fires exactly one same-origin report ───────────────────────────────
let inAppTarget = null;
{
  const context = await fresh();
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
  const postsAfterLoad = navPosts.length;
  check('a full page load reports nothing from the browser', postsAfterLoad === 0, `posts=${postsAfterLoad}`);
  // A client-router navigation needs a next/link, i.e. a link inside the header nav — the footer's plain
  // anchors would reload the document. Whichever of these is visible at this width will do.
  const link = page.locator('header a[href="/benchmarks"]:visible, header a[href="/benchmaxxing"]:visible, header a[href="/compare"]:visible, header a[href="/models"]:visible').first();
  const navigated = await link.click({ timeout: 15_000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(2_500);
  inAppTarget = new URL(page.url()).pathname;
  check('the click was an in-app navigation, not a reload', navigated && inAppTarget !== '/' && postsAfterLoad === 0, `path=${inAppTarget}`);
  const mine = navPosts.filter((p) => p.method === 'POST');
  check('exactly one /api/page-view report per in-app navigation', mine.length === 1, `posts=${JSON.stringify(navPosts)}`);
  check('the report body is the path and nothing else', mine.length === 1 && Object.keys(JSON.parse(mine[0].body || '{}')).join() === 'path'
    && JSON.parse(mine[0].body).path === inAppTarget, mine[0]?.body);
  // The browser must never talk to the analytics host itself (CR-67.5 §6/§7).
  check('the browser made no request to the analytics host', thirdParty.length === 0, thirdParty.join(' '));
  const storage = await page.evaluate(() => ({
    keys: Object.keys(localStorage).concat(Object.keys(sessionStorage)),
    cookies: document.cookie,
  }));
  check('the page-view path sets no cookie and no new storage key', !storage.cookies
    && storage.keys.every((k) => /^(bh[-._].*|mmc\.settings\.v\d+)$/.test(k)), JSON.stringify(storage));
  await context.close();
}

// ── 5. the endpoint itself: a marker navigation counts, a foreign Origin and an unknown route do not ──
{
  const post = async (origin, path) => {
    const res = await fetch(`${BASE}/api/page-view`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, 'user-agent': CHROME, ...EXTRA },
      body: JSON.stringify({ path }),
      signal: AbortSignal.timeout(20_000),
    });
    return res.status;
  };
  const own = process.env.BH_ORIGIN || new URL(BASE).origin;
  check('the endpoint answers 204 to its own origin', await post(own, marker('nav')) === 204);
  check('the endpoint answers 204 to a foreign origin (and forwards nothing)', await post('https://evil.example', marker('foreign')) === 204);
  check('the endpoint answers 204 to an unknown route (and forwards nothing)', await post(own, `/wp-admin/bh-cr177-${RUN}`) === 204);
}

await browser.close();
await new Promise((r) => setTimeout(r, 5_000));

// ── the numbers ────────────────────────────────────────────────────────────────────────────────
const after = await stats(dayAgo).catch((e) => ({ error: e.message }));
const rows = await paths(t0).catch(() => []);
const perPath = Object.fromEntries(NAMED.concat(['doc', 'gpc', 'dnt', 'nav', 'foreign'].map(marker)).map((p) => [p, countOf(rows, p)]));

check('page views exist at all (the CR-177 defect is gone)', pv(after) > 0, `pageviews(24h)=${pv(after)}`);
check('the run added page views', pv(after) - pv(before) >= 5, `before=${pv(before)} after=${pv(after)}`);
for (const path of NAMED) check(`${path} is counted by name`, perPath[path] >= 1, `views=${perPath[path]}`);
check('a page load is exactly one page view', perPath[marker('doc')] === 1, `views=${perPath[marker('doc')]}`);
check('GPC adds nothing', perPath[marker('gpc')] === 0, `views=${perPath[marker('gpc')]}`);
check('DNT adds nothing', perPath[marker('dnt')] === 0, `views=${perPath[marker('dnt')]}`);
check('an in-app navigation report becomes exactly one page view', perPath[marker('nav')] === 1, `views=${perPath[marker('nav')]}`);
check('a foreign origin adds nothing', perPath[marker('foreign')] === 0, `views=${perPath[marker('foreign')]}`);
check('the real in-app navigation target is counted', inAppTarget ? countOf(rows, inAppTarget) >= 1 : false, `path=${inAppTarget} views=${inAppTarget ? countOf(rows, inAppTarget) : '-'}`);
check('no path outside the site\'s route list was forwarded', !rows.some((r) => r.x === '(unknown route)' || r.x.includes('wp-admin') || r.x.includes('?')),
  rows.filter((r) => r.x === '(unknown route)' || r.x.includes('wp-admin') || r.x.includes('?')).map((r) => r.x).join(' '));

const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, `${JSON.stringify({
  base: BASE, run: RUN, at: new Date().toISOString(),
  pageviews: { before: pv(before), after: pv(after) }, perPath, marker_paths: 'the /models/bh-cr177-* rows below are this run\'s own markers',
  paths_in_window: rows, passed, total: results.length, results,
}, null, 2)}\n`);
console.log(`\n${passed}/${results.length} — ${OUT}/verification.json`);
process.exit(passed === results.length ? 0 : 1);
