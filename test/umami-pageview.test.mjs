import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allowForward, documentPageview, FORWARD_UA, navigationPageview, pageviewPayload, sendPageview, UMAMI_ORIGIN } from '../lib/umami-pageview.mjs';

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const headers = (extra = {}) => ({ get: (k) => ({ 'user-agent': CHROME, 'sec-fetch-dest': 'document', host: 'benchmarkheaven.com', ...extra }[k.toLowerCase()] ?? null) });
const doc = (url, extra = {}, method = 'GET') => ({ method, url, headers: headers(extra) });

test('CR-177.1: a full page load on a public host becomes a page view with the route path only', () => {
  assert.deepEqual(documentPageview(doc('https://benchmarkheaven.com/jev-models?w=1,2')), { hostname: 'benchmarkheaven.com', url: '/jev-models' });
  assert.deepEqual(documentPageview(doc('https://benchmarkheaven.com/')), { hostname: 'benchmarkheaven.com', url: '/' });
  // The forwarded hostname is the ingress host, not Next.js's internal localhost URL.
  assert.deepEqual(documentPageview(doc('http://localhost:3000/compare', { 'x-forwarded-host': 'www.benchmarkheaven.com' })),
    { hostname: 'www.benchmarkheaven.com', url: '/compare' });
  assert.deepEqual(documentPageview(doc('https://model-market-comparison.app.mintapis.com/image-jev-bench', { host: 'model-market-comparison.app.mintapis.com' })),
    { hostname: 'model-market-comparison.app.mintapis.com', url: '/image-jev-bench' });
});

test('CR-177.1: D213 — the two pages Florian asks about are known routes, not "(unknown route)"', () => {
  for (const path of ['/jev-models', '/jev-models/v1.4.2', '/image-jev-bench']) {
    assert.equal(documentPageview(doc(`https://benchmarkheaven.com${path}`))?.url, path);
  }
});

test('CR-177.1: GPC/DNT, prefetches, bots, non-documents, unknown routes and foreign hosts send nothing', () => {
  assert.equal(documentPageview(doc('https://benchmarkheaven.com/', { 'sec-gpc': '1' })), null);
  assert.equal(documentPageview(doc('https://benchmarkheaven.com/', { dnt: '1' })), null);
  assert.equal(documentPageview(doc('https://benchmarkheaven.com/', { 'sec-purpose': 'prefetch;prerender' })), null);
  assert.equal(documentPageview(doc('https://benchmarkheaven.com/', { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' })), null);
  assert.equal(documentPageview(doc('https://benchmarkheaven.com/about', { 'sec-fetch-dest': 'empty' })), null);
  assert.equal(documentPageview(doc('https://benchmarkheaven.com/wp-login.php')), null);
  assert.equal(documentPageview(doc('https://benchmarkheaven.com/wp-admin/setup')), null, 'an unknown route must not reach Umami at all');
  assert.equal(documentPageview(doc('https://benchmarkheaven.com/', {}, 'POST')), null);
  assert.equal(documentPageview(doc('https://evil.example/', { host: 'evil.example' })), null);
});

test('CR-177.1: an in-app navigation is accepted same-origin only and its path is re-derived', () => {
  const nav = (extra = {}) => headers({ origin: 'https://benchmarkheaven.com', ...extra });
  assert.deepEqual(navigationPageview(nav(), '/compare?a=1#x'), { hostname: 'benchmarkheaven.com', url: '/compare' });
  assert.deepEqual(navigationPageview(nav(), '/models/openai/gpt-6/extra/deeper'), { hostname: 'benchmarkheaven.com', url: '/models/openai/gpt-6' });
  // Nothing a caller writes reaches Umami verbatim: unknown routes, absolute URLs and rubbish are dropped.
  assert.equal(navigationPageview(nav(), '/wp-admin'), null);
  assert.equal(navigationPageview(nav(), 'https://evil.example/x'), null);
  assert.equal(navigationPageview(nav(), '/' + 'a'.repeat(600)), null);
  assert.equal(navigationPageview(nav(), 42), null);
  assert.equal(navigationPageview(nav(), undefined), null);
  // Origin must match the ingress-provided public origin, and GPC/DNT/bots are dropped server-side too.
  assert.equal(navigationPageview(nav({ origin: 'https://evil.example' }), '/'), null);
  assert.equal(navigationPageview(headers(), '/'), null, 'a missing Origin is not a navigation from our page');
  assert.equal(navigationPageview(nav({ 'sec-gpc': '1' }), '/'), null);
  assert.equal(navigationPageview(nav({ dnt: 'yes' }), '/'), null);
  assert.equal(navigationPageview(nav({ 'user-agent': 'python-requests/2.32' }), '/'), null);
});

test('CR-177.1: the payload is a page view (no event name) and carries no identifier or visitor header', () => {
  const body = pageviewPayload({ hostname: 'benchmarkheaven.com', url: '/jev-models' }, 'site-id');
  assert.deepEqual(body, { type: 'event', payload: { website: 'site-id', hostname: 'benchmarkheaven.com', url: '/jev-models' } });
  // Umami treats a payload *with* a name as a custom event — that is why CR-167's relay produced 0 page views.
  assert.equal('name' in body.payload, false);
  for (const banned of [/ip\b/i, /referr/i, /session/i, /cookie/i, /hash/i, /screen/i, /language/i]) assert.doesNotMatch(JSON.stringify(body), banned);
});

test('CR-177.1: the forward is server-to-server with a fixed agent, and a missing website id sends nothing', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true }; };
  assert.equal(await sendPageview({ hostname: 'benchmarkheaven.com', url: '/' }, { website: 'site-id', fetchImpl }), true);
  assert.equal(calls[0].url, `${UMAMI_ORIGIN}/api/send`);
  assert.equal(calls[0].init.headers['user-agent'], FORWARD_UA);
  assert.doesNotMatch(FORWARD_UA, /bot|crawl|spider|headless|benchmarkheaven/i, 'Umami drops agents its bot filter recognises');
  assert.equal(calls[0].init.redirect, 'error');
  assert.deepEqual(JSON.parse(calls[0].init.body), { type: 'event', payload: { website: 'site-id', hostname: 'benchmarkheaven.com', url: '/' } });
  assert.equal(await sendPageview({ hostname: 'benchmarkheaven.com', url: '/' }, { website: '', fetchImpl }), false);
  assert.equal(await sendPageview(null, { website: 'site-id', fetchImpl }), false);
  assert.equal(calls.length, 1);
  // A failing Umami is never the visitor's problem.
  assert.equal(await sendPageview({ hostname: 'benchmarkheaven.com', url: '/' }, { website: 'site-id', fetchImpl: async () => { throw new Error('down'); } }), false);
});

test('CR-177.1: forwards are capped per minute and the budget refills', () => {
  const state = { minute: -1, used: 0 };
  const t = Date.UTC(2026, 8, 26, 12);
  assert.equal(allowForward(t, state, 2), true);
  assert.equal(allowForward(t + 1_000, state, 2), true);
  assert.equal(allowForward(t + 2_000, state, 2), false);
  assert.equal(allowForward(t + 61_000, state, 2), true);
});

test('CR-177.1/CR-67.4: the page-view path adds no third-party script and no device storage', () => {
  const reporter = readFileSync(new URL('../components/PageViewReporter.tsx', import.meta.url), 'utf8');
  // Only the code, so the file may still explain in prose what it does not do.
  const code = reporter.replace(/^\s*\/\/.*$/gm, '');
  // Same-origin only: the browser must never be pointed at the analytics host (CR-67.5 §6/§7).
  assert.match(code, /fetch\("\/api\/page-view"/);
  assert.doesNotMatch(code, /bh-analytics|mintapis|https?:\/\//i);
  assert.doesNotMatch(code, /localStorage|sessionStorage|document\.cookie|<script/i);
  assert.match(code, /credentials: "omit"/);
  assert.match(code, /globalPrivacyControl/, 'GPC/DNT stop the report in the browser as well');
  const route = readFileSync(new URL('../app/api/page-view/route.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(route, /cookies\(|x-forwarded-for|remote-?addr|\.ip\b/i);
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /<PageViewReporter \/>/);
});
