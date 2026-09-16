// Iteration 82 (CR-37.2 / CR-38.4): the Lumina Bench discovery feed carries no values, and the site says what
// aggregators are used for. Live checks: the deployed revision, /about#aggregators at 1440/390 light/dark, and
// that no published observation for a sample of frontier configurations cites an aggregator host.
// Usage: node verify-iter82.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter82';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const meta = await (await fetch(`${BASE}/api/meta`)).json();
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// The aggregator hosts come from the committed policy the repository test uses.
const policy = JSON.parse(readFileSync(new URL('../../../data/lumina-feed-policy.json', import.meta.url), 'utf8'));
const aggregators = new Set(policy.host_roles.aggregator);
const host = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return null; } };
const SAMPLE = ['claude-opus-5::max', 'claude-fable-5::high', 'gpt-5.6-sol::xhigh', 'gpt-6-astra::max', 'kimi-k3::max', 'glm-5.3-flash::reasoning', 'deepseek-v4-pro::thinking', 'gemini-3.5-pro::high'];
let seen = 0; const bad = []; const hosts = new Set();
for (const id of SAMPLE) {
  const r = await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent(id)}&limit=500`)).json();
  for (const o of r.observations ?? r.results ?? []) { seen += 1; hosts.add(host(o.source?.url)); if (aggregators.has(host(o.source?.url))) bad.push(`${id} ${o.benchmark_id} ${o.source?.url}`); }
}
check('API: no published observation for the sample cites an aggregator host', seen > 50 && bad.length === 0, { observations: seen, bad: bad.slice(0, 5), hosts: [...hosts].sort() });

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/about?v=${Date.now()}`);
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  const li = await page.evaluate(() => document.getElementById('aggregators')?.innerText.replace(/\s+/g, ' ').trim() ?? '');
  check(`${tag} /about#aggregators names Lumina Bench and BenchLM as discovery-only`, /Lumina Bench/.test(li) && /BenchLM/.test(li) && /only to discover benchmarks/.test(li), li.slice(0, 200));
  check(`${tag} /about#aggregators says self-reported numbers are labelled and nothing is counted twice`, /labelled self-reported/.test(li) && /never counted twice/.test(li), '');
  const box = await page.locator('#aggregators').boundingBox();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} the note is visible and nothing overflows horizontally`, box && box.width > 200 && overflow <= 1, { box, overflow });
  await page.locator('#aggregators').scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/${tag}-about-aggregators.png` }).catch(() => {});
  check(`${tag} no page errors`, errors.length === 0, errors.join(' | '));
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), runner: process.env.BH_RUNNER || null, passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ` — ${c.detail}`}`);
console.log(`${passed}/${checks.length}`);
process.exitCode = passed === checks.length ? 0 : 1;
