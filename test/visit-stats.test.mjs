import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyRequest, createAccumulator, flushRows, normalisePath, visitReport, VISIT_STATS_SCHEMA_SQL } from '../lib/visit-stats.mjs';

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const req = (url, headers = {}, method = 'GET') => ({
  method, url, headers: { get: (k) => ({ 'user-agent': CHROME, 'sec-fetch-dest': 'document', ...headers })[k.toLowerCase()] ?? null },
});

test('CR-67.4: a document load from outside is a view and a visit with the referring host only', () => {
  assert.deepEqual(classifyRequest(req('https://benchmarkheaven.com/models/x?utm_source=y', { referer: 'https://www.news.ycombinator.com/item?id=1' })),
    { path: '/models/x', referrerHost: 'news.ycombinator.com', visit: true });
  assert.deepEqual(classifyRequest(req('https://benchmarkheaven.com/')), { path: '/', referrerHost: '', visit: true });
});

test('CR-67.4: same-site page loads are views, not visits', () => {
  assert.deepEqual(classifyRequest(req('https://benchmarkheaven.com/compare', { referer: 'https://www.benchmarkheaven.com/' })),
    { path: '/compare', referrerHost: '', visit: false });
});

test('CR-67.4: prefetches, assets, APIs, bots, non-GET and GPC/DNT requests are not counted', () => {
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/about?_rsc=abc', { 'sec-fetch-dest': 'empty' })), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/about', { 'sec-purpose': 'prefetch;prerender' })), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/_next/static/chunk.js')), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/api/meta')), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/logo.png')), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/', { 'sec-fetch-dest': 'image' })), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/', { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' })), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/', { 'user-agent': 'Mozilla/5.0 HeadlessChrome/140' })), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/', { 'user-agent': '' })), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/', {}, 'HEAD')), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/', { 'sec-gpc': '1' })), null);
  assert.equal(classifyRequest(req('https://benchmarkheaven.com/', { dnt: '1' })), null);
});

test('CR-67.4: unknown routes fold into one row and deep paths are truncated', () => {
  assert.equal(normalisePath('/wp-login.php'), null);
  assert.equal(normalisePath('/wp-admin/setup'), '(other)');
  assert.equal(normalisePath('/models/a/b/c/d'), '/models/a/b');
  assert.equal(normalisePath('/benchmarks/'), '/benchmarks');
});

test('CR-67.4: the accumulator keeps daily totals only and restores a failed flush', () => {
  const acc = createAccumulator();
  const t = Date.UTC(2026, 8, 17, 10);
  acc.add({ path: '/', referrerHost: 'x.com', visit: true }, t);
  acc.add({ path: '/', referrerHost: 'x.com', visit: false }, t);
  acc.add({ path: '/', referrerHost: 'x.com', visit: true }, t + 86_400_000);
  const rows = acc.take();
  assert.deepEqual(rows, [
    { day: '2026-09-17', path: '/', referrerHost: 'x.com', views: 2, visits: 1 },
    { day: '2026-09-18', path: '/', referrerHost: 'x.com', views: 1, visits: 1 },
  ]);
  assert.equal(acc.size(), 0);
  acc.add({ path: '/', referrerHost: 'x.com', visit: false }, t);
  acc.restore(rows);
  assert.deepEqual(acc.take()[0], { day: '2026-09-17', path: '/', referrerHost: 'x.com', views: 3, visits: 1 });
});

test('CR-67.4: stored schema and flush carry no identifier, IP or user agent', async () => {
  const columns = VISIT_STATS_SCHEMA_SQL.replace(/^--.*$/gm, '');
  for (const banned of [/\bip\b/i, /agent/i, /hash/i, /session/i, /user/i, /cookie/i]) assert.doesNotMatch(columns, banned);
  const calls = [];
  await flushRows(async (sql, params) => { calls.push({ sql, params }); return { rows: [] }; },
    [{ day: '2026-09-17', path: '/', referrerHost: '', views: 2, visits: 1 }]);
  assert.match(calls[0].sql, /ON CONFLICT \(day, path, referrer_host\)/);
  assert.deepEqual(calls[0].params, ['2026-09-17', '/', '', 2, 1]);
  assert.match(calls[1].sql, /DELETE FROM bh_visit_daily WHERE day < \(current_date - interval '13 months'\)/);
});

test('CR-67.4: the operator report returns aggregates and no unique-visitor figure', async () => {
  const report = await visitReport(async (sql) => ({
    rows: sql.includes('GROUP BY day') ? [{ day: '2026-09-17', views: 5, visits: 2 }]
      : sql.includes('GROUP BY path') ? [{ path: '/', views: 5, visits: 2 }] : [{ referrer_host: 'x.com', visits: 1 }],
  }), 7);
  assert.equal(report.days, 7);
  assert.equal(report.unique_visitors, null);
  assert.deepEqual(report.totals, { views: 5, visits: 2 });
  assert.deepEqual(Object.keys(report.top_referrers[0]), ['referrer_host', 'visits']);
});

test('CR-67.4/67.6: the site ships no client analytics, so no consent banner is needed', () => {
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(layout, /plausible|umami|matomo|googletagmanager|gtag|analytics\.js|posthog|clarity|fathom|hotjar/i);
  const counter = readFileSync(new URL('../lib/visit-counter.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(counter, /cookies\(|set-cookie|x-forwarded-for|remote-?addr|\.ip\b/i);
  const route = readFileSync(new URL('../app/api/operator/visits/route.ts', import.meta.url), 'utf8');
  assert.match(route, /timingSafeEqual/);
});
