// CR-30.1 / CR-30.3: labs' own published benchmark numbers reach the product as self-reported
// observations with their provenance, and stay distinguishable from independent measurements.
// API + UI at 1440/390, light and dark. Usage: node verify-cr-30.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-30';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000); };
const api = async (path) => (await (await fetch(`${BASE}${path}`)).json());

// Values a lab printed about its own model, each re-verified against our capture of the document.
const CASES = [
  { model: 'claude-fable-5.1::max', benchmark: 'swe-bench-multilingual::snapshot-2026-09-10', value: 89.1 },
  { model: 'claude-fable-5.1::max', benchmark: 'swe-bench-multimodal::snapshot-2026-09-10', value: 54.7 },
  { model: 'claude-opus-5::max', benchmark: 'swe-bench-multilingual::snapshot-2026-09-10', value: 89.5 },
  { model: 'claude-opus-4.8::max', benchmark: 'swe-bench-verified::snapshot-2026-09-10', value: 88.6 },
  { model: 'claude-fable-5::max', benchmark: 'terminal-bench::4.0', value: 42 },
  { model: 'qwen3.8-max::default', benchmark: 'longbench::2', value: 66.3 },
];
for (const c of CASES) {
  const r = await api(`/api/benchmark-scores?model_id=${encodeURIComponent(c.model)}&benchmark_id=${encodeURIComponent(c.benchmark)}&basis=self_reported`);
  const hit = (r.observations || []).find((o) => Math.abs(o.value - c.value) < 1e-9);
  check(`CR-30.1 ${c.model} carries the ${c.benchmark.split('::')[0]} value its lab published (${c.value})`, !!hit, { total: r.total, values: (r.observations || []).map((o) => o.value) });
  if (!hit) continue;
  check(`CR-30.1 ${hit.id} is self-reported, never a measurement and never a comparison pair`,
    hit.basis === 'self_reported' && hit.comparison_key === null, { basis: hit.basis, comparison_key: hit.comparison_key });
  check(`CR-30.1 ${hit.id} names the document, the retrieval date and the line the value was read in`,
    /^https:\/\//.test(hit.source?.url || '') && /^\d{4}-\d\d-\d\d/.test(hit.source?.retrieved_at || '')
    && /matched line: /.test(hit.source?.locator || '') && String(hit.source.locator).includes(String(c.value)),
    (hit.source?.locator || '').slice(0, 160));
  check(`CR-30.1 ${hit.id} says which lab reported it`, /self-reported by \S/i.test(hit.protocol || ''), (hit.protocol || '').slice(0, 120));
}
// The whole tranche, and the rule that none of it can pass as a measurement.
const all = await api('/api/benchmark-scores?basis=self_reported&limit=500');
const mine = (all.observations || []).filter((o) => o.id.startsWith('self-reported:'));
check('CR-30.1 the release-document tranche is live', mine.length >= 40, { self_reported_total: all.total, tranche: mine.length });
check('CR-30.1 every tranche row is self-reported with a retained capture and no comparison pair',
  mine.every((o) => o.basis === 'self_reported' && o.comparison_key === null
    && String(o.source?.file || '').startsWith('data/raw/benchmarks/self-reported/')),
  mine.filter((o) => o.comparison_key !== null || !String(o.source?.file || '').startsWith('data/raw/benchmarks/self-reported/')).map((o) => o.id).slice(0, 5));
const measured = await api('/api/benchmark-scores?basis=measured&limit=500');
check('CR-30.1 no tranche row appears as an independent measurement',
  !(measured.observations || []).some((o) => o.id.startsWith('self-reported:')), '');

// CR-30.3: the values are visible and marked, in the same places the other results are.
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/benchmarks?benchmark=${encodeURIComponent("swe-bench-multilingual::snapshot-2026-09-10")}`);
  await settle(page);
  let body = await page.locator('body').innerText();
  check(`${tag} CR-30.3 the SWE-bench Multilingual board shows the newly ingested values`, /89\.1/.test(body) && /89\.5/.test(body), body.slice(0, 200).replace(/\s+/g, ' '));
  check(`${tag} CR-30.3 the board keeps an evidence control that separates self-reported from measured`,
    await page.locator('select').filter({ hasText: /Self-reported/i }).count() > 0
    || /self-reported/i.test(body), '');
  await page.screenshot({ path: `${OUT}/${tag}-board.png`, fullPage: false });
  await goto(page, `${BASE}/models/${encodeURIComponent('claude-fable-5.1::max')}`);
  await settle(page);
  body = await page.locator('body').innerText();
  check(`${tag} CR-30.3 the model page shows a value from its own release document`, /89\.1|54\.7/.test(body), '');
  await page.screenshot({ path: `${OUT}/${tag}-model.png`, fullPage: false });
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 200)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
