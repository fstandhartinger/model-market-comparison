// Acceptance for CR-67.4 / 67.6 / 67.7 (visitor statistics, no-banner branch, privacy disclosure) on one host.
// Usage: [VISIT_STATS_TOKEN=…] node verify-cr-67-analytics.mjs <base> <outdir>
// The token is read from the environment only and never printed or written to evidence.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter95-cr67/canonical';
const TOKEN = process.env.VISIT_STATS_TOKEN;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const origin = new URL(BASE).origin;
const FUNCTIONAL_KEYS = /^(bh[-._].*|mmc\.settings\.v\d+)$/; // theme, value-map, shortlist, presets, hints; filter settings

// ── Operator API ─────────────────────────────────────────────────────────────────────────────
const noTok = await fetch(`${BASE}/api/operator/visits`);
check('operator report refuses anonymous callers', noTok.status === 401 || noTok.status === 404, `status=${noTok.status}`);
check('operator report sends no public CORS header', !noTok.headers.get('access-control-allow-origin'));
const badTok = await fetch(`${BASE}/api/operator/visits`, { headers: { authorization: 'Bearer wrong-token-wrong-token-wrong-token' } });
check('operator report refuses a wrong token', badTok.status === 401 || badTok.status === 404, `status=${badTok.status}`);
const report = async () => {
  const r = await fetch(`${BASE}/api/operator/visits?days=2`, { headers: { authorization: `Bearer ${TOKEN}` } });
  return { status: r.status, body: r.status === 200 ? await r.json() : null };
};
let before = null;
if (TOKEN) {
  before = await report();
  check('operator report answers with the token', before.status === 200, `status=${before.status}`);
  const b = before.body ?? {};
  check('report holds aggregates only', JSON.stringify(Object.keys(b)) === JSON.stringify(['days', 'unique_visitors', 'unique_visitors_note', 'totals', 'daily', 'top_pages', 'top_referrers'])
    && b.unique_visitors === null
    && (b.top_pages ?? []).every((r) => JSON.stringify(Object.keys(r)) === '["path","views","visits"]')
    && (b.top_referrers ?? []).every((r) => JSON.stringify(Object.keys(r)) === '["referrer_host","visits"]'), JSON.stringify(Object.keys(b)));
}

// ── Anonymous page responses: no cookies ──────────────────────────────────────────────────────
for (const path of ['/', '/benchmarks', '/privacy', '/models/claude-opus-5']) {
  const r = await fetch(`${BASE}${path}`, { headers: { 'user-agent': CHROME, 'sec-fetch-dest': 'document', accept: 'text/html' } });
  check(`GET ${path} sets no cookie`, r.status < 400 && !r.headers.get('set-cookie'), `status=${r.status} set-cookie=${r.headers.get('set-cookie') ? 'yes' : 'none'}`);
}

// ── Browser: no third-party requests, no new storage, no banner; privacy text ──────────────────
const b = await chromium.launch();
for (const ctxDef of [
  { name: 'desktop_light', viewport: { width: 1440, height: 1000 }, colorScheme: 'light' },
  { name: 'mobile_dark', viewport: { width: 390, height: 844 }, colorScheme: 'dark', isMobile: true, hasTouch: true },
]) {
  const ctx = await b.newContext({ ...ctxDef, name: undefined });
  const page = await ctx.newPage();
  const foreign = new Set();
  page.on('request', (req) => { const u = new URL(req.url()); if (u.origin !== origin && !u.protocol.startsWith('data')) foreign.add(u.host); });
  for (const path of ['/', '/benchmarks', '/compare']) { await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90_000 }); }
  check(`${ctxDef.name}: no request to another host`, foreign.size === 0, [...foreign].join(',') || 'none');
  const cookies = await ctx.cookies();
  check(`${ctxDef.name}: no cookies without sign-in`, cookies.length === 0, cookies.map((c) => c.name).join(',') || 'none');
  const keys = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
  check(`${ctxDef.name}: only functional storage keys`, keys.every((k) => FUNCTIONAL_KEYS.test(k)), keys.join(',') || 'none');
  const banner = await page.locator('text=/cookie|consent|Einwilligung/i').count();
  check(`${ctxDef.name}: no consent banner`, banner === 0, `matches=${banner}`);
  await page.goto(`${BASE}/privacy`, { waitUntil: 'networkidle' });
  const text = await page.locator('article').innerText();
  check(`${ctxDef.name}: privacy has a visitor statistics section`, await page.locator('#visitor-statistics').count() === 1);
  for (const phrase of ['13 months', 'Global Privacy Control', 'cannot count unique visitors', 'Hetzner Online GmbH', 'fewer than 3', 'Art. 6(1)(f) GDPR', '§ 25 TDDDG', 'without path or query']) {
    check(`${ctxDef.name}: privacy mentions "${phrase}"`, text.includes(phrase));
  }
  check(`${ctxDef.name}: privacy no longer claims no analytics`, !/We use no analytics/i.test(text));
  await page.screenshot({ path: `${OUT}/${ctxDef.name}-privacy.png`, fullPage: false });
  await ctx.close();
}
await b.close();

// ── Counting works: one document load from an external referrer increments views and visits ────
if (TOKEN && before?.body) {
  const marker = `verify-cr67-${Date.now()}.example`;
  // Three of each: the report folds rows below 3, so a counted GPC/bot load would show up as its own row.
  for (let i = 0; i < 3; i++) {
    await fetch(`${BASE}/terms`, { headers: { 'user-agent': CHROME, 'sec-fetch-dest': 'document', referer: `https://${marker}/x?y=1` } });
    await fetch(`${BASE}/terms`, { headers: { 'user-agent': CHROME, 'sec-fetch-dest': 'document', 'sec-gpc': '1', referer: `https://gpc-${marker}/` } });
    await fetch(`${BASE}/terms`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)', 'sec-fetch-dest': 'document', referer: `https://bot-${marker}/` } });
  }
  const after = await report(); // the route flushes pending totals first
  const refs = after.body?.top_referrers ?? [];
  const hit = refs.find((r) => r.referrer_host === marker);
  check('real page loads are counted with the referrer host only', hit?.visits === 3, JSON.stringify(hit ?? null));
  check('rows below 3 are folded in the report', (after.body?.top_referrers ?? []).every((r) => r.visits >= 3 || r.referrer_host === '(other)'));
  check('GPC and bot loads are not counted', !refs.some((r) => r.referrer_host.includes(`-${marker}`)));
  check('total views grew', (after.body?.totals.views ?? 0) > before.body.totals.views, `${before.body.totals.views} → ${after.body?.totals.views}`);
}

const failed = results.filter((r) => !r.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results }, null, 2));
console.log(`${results.length - failed.length}/${results.length}`);
process.exit(failed.length ? 1 : 0);
