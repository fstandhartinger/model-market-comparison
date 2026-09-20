// CR-95 live verification (2026-09-19): JevBench v1.2.2 adds Laya, jeff, GLiNER2, openJev Verdict and classifier.dev (fast tier).
// Checks the artifact the page serves, the five rows and their ranks, the two new types, the footnotes, the "why a Jev service
// leads" line and the revision. Run verify-cr-92.mjs as well for the full page check.
// Usage: node verify-cr-93.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-93';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const a = await (await fetch(`${BASE}/api/jevbench/v1.2`)).json();
// CR-97 (2026-09-20) took classifier.dev out of the ranking (it runs Jev): it keeps its score with no rank, and the four
// ranked rows below it each move up one place. Everything else CR-95 added must survive that unchanged.
const V124 = a.revision >= 'v1.2.4';
const V125 = a.revision === 'v1.2.5';
const NEW = V125
  ? { 'classifier-dev-fast': [null, '84.8'], laya: [4, '70.1'], jeff: [8, '66.9'], 'openjev-verdict': [11, '66.2'], gliner2: [21, '53.0'] }
  : a.revision === 'v1.2.2'
  ? { 'classifier-dev-fast': [1, '84.8'], laya: [5, '70.1'], jeff: [9, '66.9'], 'openjev-verdict': [11, '66.1'], gliner2: [18, '52.9'] }
  : V124
    ? { 'classifier-dev-fast': [null, '84.8'], laya: [4, '70.1'], jeff: [8, '66.9'], 'openjev-verdict': [10, '66.2'], gliner2: [17, '53.0'] }
    : { 'classifier-dev-fast': [1, '84.8'], laya: [5, '70.1'], jeff: [9, '66.9'], 'openjev-verdict': [11, '66.2'], gliner2: [18, '53.0'] };
const row = (k) => a.systems.find((s) => s.key === k);
// CR-96 (2026-09-20) corrected every price and moved the revision to v1.2.3; the five v1.2.2 rows and their ranks must survive it.
check('artifact: revision v1.2.2 or later', ['v1.2.2', 'v1.2.3', 'v1.2.4', 'v1.2.5'].includes(a.revision), a.revision);
for (const [k, [rank, score]] of Object.entries(NEW)) {
  const r = row(k);
  check(`artifact: ${k} ${rank === null ? 'listed without a rank' : `rank ${rank}`}, ${score}`, r && r.rank === rank && r.jevbench_score.toFixed(1) === score, r && [r.rank, r.jevbench_score]);
  check(`artifact: ${k} has a price, a footnote and no automatic 100`, r && r.cost.usd_per_1000 > 0 && r.axes.cost < 100 && a.footnotes[k], r && [r.cost.usd_per_1000, r.axes.cost]);
}
check('artifact: jev 1.13.0 at 75.3 (v1.2.2) or 75.4 (v1.2.3 cost correction)', ['75.3', '75.4'].includes(row('jev-1.13.0').jevbench_score.toFixed(1)), row('jev-1.13.0').jevbench_score);
check('artifact: classifier.dev is a production API, not adjusted; the four local rows are', row('classifier-dev-fast').endpoint_kind === 'api'
  && ['laya', 'jeff', 'gliner2', 'openjev-verdict'].every((k) => row(k).endpoint_kind === 'cpu' && Math.abs(row(k).speed.p50_s_adjusted - (2 * row(k).speed.p50_s_raw + 0.15)) < 1e-9), '');
check('artifact: the new types', row('classifier-dev-fast').class === 'jev-service' && row('gliner2').class === 'classifier', '');
const b = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
    const m = kind === 'mobile'; const tag = `${kind}_${theme}`;
    const c = await b.newContext({ viewport: vp, isMobile: m, hasTouch: m, colorScheme: theme, deviceScaleFactor: m ? 2 : 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    try {
      await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
      const bars = await p.$$eval('[data-bh-jevc-bars] [data-bh-jev12-bar]', (e) => e.map((x) => x.getAttribute('data-bh-jev12-bar')));
      for (const [k, [rank, score]] of Object.entries(NEW)) {
        check(`${tag}: ${k} is ${rank === null ? 'a bar below the ranking' : `bar ${rank}`}`, rank === null ? bars.indexOf(k) >= a.systems.filter((s) => s.ranked).length : bars[rank - 1] === k, bars.slice(0, 20));
        const bar = await p.$(`[data-bh-jevc-bars] [data-bh-jev12-bar="${k}"]`);
        const txt = bar ? await bar.textContent() : '';
        check(`${tag}: ${k} bar shows ${score}`, txt.includes(score), txt.slice(0, 160));
        check(`${tag}: ${k} footnote`, ((await p.textContent(`[data-bh-jev12-footnote="${k}"]`)) || '').length > 40, '');
      }
      const lead = (await p.textContent(V124 ? '[data-bh-jev12-honorable-lead]' : '[data-bh-jev12-service-lead]')) || '';
      check(`${tag}: the headline explains the Jev service`, lead.includes('Jev') && (!V124 || /not ranked/i.test(lead)), lead.slice(0, 160));
      // v1.2.4: the only "Service built on Jev" row is unranked and drawn grey, so its type leaves the colour legend and
      // the honorable-mention section carries the same fact in words instead.
      const chartText = (await p.textContent('[data-bh-jevc-chart]')) || '';
      check(`${tag}: the new types are named`, V124
        ? /honorable mention/i.test(chartText) && /Zero-shot classifier/.test(chartText)
        : chartText.includes('Service built on Jev'), chartText.slice(0, 200));
      check(`${tag}: eyebrow says the artifact revision`, ((await p.textContent('[data-bh-jevc-chart] .bh-eyebrow')) || '').includes(a.revision), a.revision);
      check(`${tag}: no page errors`, errs.length === 0, errs);
      await p.locator('[data-bh-jevc-chart]').screenshot({ path: `${OUT}/${tag}-chart.png` });
    } finally { await c.close(); }
  }
} finally { await b.close(); }
const bad = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - bad.length, total: checks.length, checks }, null, 1));
console.log(`${BASE}: ${checks.length - bad.length}/${checks.length}`); for (const x of bad) console.log('FAIL', x.name, x.detail);
process.exit(bad.length ? 1 : 0);
