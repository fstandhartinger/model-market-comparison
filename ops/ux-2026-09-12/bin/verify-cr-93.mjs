// CR-93 live verification (2026-09-19): JevBench v1.2.1 adds djev (Maisa, diffusion-gemma) — rank 3, "announced" price tag,
// † footnote, revision v1.2.1 on the page; every other row as in v1.2. Run verify-cr-92.mjs as well for the full page check.
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
const dj = a.systems.find((s) => s.key === 'djev');
check('artifact: revision v1.2.1 or later', ['v1.2.1', 'v1.2.2'].includes(a.revision), a.revision);  // CR-95: v1.2.2 keeps djev, one rank lower
check('artifact: djev rank 4 (was 3 in v1.2.1), 74.3', dj && dj.rank === 4 && dj.jevbench_score.toFixed(1) === '74.3', dj && [dj.rank, dj.jevbench_score]);
check('artifact: djev announced price, production API, no adjustment', dj && dj.cost.kind === 'announced' && dj.endpoint_kind === 'api' && dj.speed.p50_s_adjusted === dj.speed.p50_s_raw, '');
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
      check(`${tag}: djev is the 4th bar`, bars[3] === 'djev', bars.slice(0, 5));
      const bar = await p.$('[data-bh-jevc-bars] [data-bh-jev12-bar="djev"]');
      const txt = bar ? await bar.textContent() : '';
      check(`${tag}: djev bar shows 74.3 and its name`, txt.includes('74.3') && txt.includes('djev'), txt.slice(0, 160));
      check(`${tag}: announced price tag`, (await p.$$('[data-bh-jev12-cost-kind="announced"]')).length >= 1, '');
      check(`${tag}: djev footnote`, ((await p.textContent('[data-bh-jev12-footnote="djev"]')) || '').includes('announced price'), '');
      check(`${tag}: eyebrow says the current revision`, /v1\.2\.[12]/.test((await p.textContent('[data-bh-jevc-chart] .bh-eyebrow')) || ''), '');
      check(`${tag}: no page errors`, errs.length === 0, errs);
      await p.locator('[data-bh-jevc-chart]').screenshot({ path: `${OUT}/${tag}-chart.png` });
    } finally { await c.close(); }
  }
} finally { await b.close(); }
const bad = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - bad.length, total: checks.length, checks }, null, 1));
console.log(`${BASE}: ${checks.length - bad.length}/${checks.length}`); for (const x of bad) console.log('FAIL', x.name, x.detail);
process.exit(bad.length ? 1 : 0);
