// CR-87 live verification (Florian 2026-09-19): /jev-models leads with the JevBench Main Composite Score chart (bars coloured
// by system type, official Balanced 33:33:33 by default), the four named presets re-score and re-rank live, any non-default weighting
// is flagged in the chart title, badge and table header with a one-click reset, ?w= restores a shared view, every project
// links out — 1440/390 px, light/dark, no page errors.
// Usage: node verify-cr-87.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-87';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
if (REV) { const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({})); check('deployed revision matches', String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV }); }
const a = await (await fetch(`${BASE}/api/jevbench/v1.1`)).json();
const ranked = a.systems.filter((s) => s.ranked);
const expectOrder = (w) => [...ranked].map((s) => ({ k: s.key, v: w[0] * s.capability.score + w[1] * s.speed.score + w[2] * s.cost.score, o: s.main_score }))
  .sort((x, y) => y.v - x.v || y.o - x.o).map((x) => x.k);
// Titles verbatim from Florian's addendum 3 (19 Sep ~09:20 UTC: Balanced is the Main Score).
const PRESETS = { balanced: [[1 / 3, 1 / 3, 1 / 3], 'JevBench Main Composite Score – (Balanced 33:33:33)'], accuracy: [[0.6, 0.2, 0.2], 'JevBench Composite Score – Emphasis on Accuracy (60:20:20)'], speed: [[0.2, 0.6, 0.2], 'JevBench Composite Score – Emphasis on Speed (20:60:20)'], cost: [[0.2, 0.2, 0.6], 'JevBench Composite Score – Emphasis on Cost (20:20:60)'] };

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const m = kind === 'mobile'; const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: m, hasTouch: m, colorScheme: theme, deviceScaleFactor: m ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 90000 });
  const bars = () => p.$$eval('[data-bh-jevc-bars] [data-bh-jev11-bar]', (e) => e.map((x) => x.getAttribute('data-bh-jev11-bar')));
  const title = () => p.textContent('[data-bh-jevc-title]');
  const header = async () => (await p.textContent('[data-bh-jev11-sort="main"]')).trim();
  check(`${tag}: default title is the official preset`, (await title()) === PRESETS.balanced[1], await title());
  check(`${tag}: default chart order = official ranking`, JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(expectOrder([1 / 3, 1 / 3, 1 / 3])), await bars());
  check(`${tag}: chart comes before the table`, await p.evaluate(() => !!(document.querySelector('[data-bh-jevc-chart]').compareDocumentPosition(document.querySelector('[data-bh-jev11-table]')) & 4)), '');
  check(`${tag}: official badge, no not-default badge`, (await p.$('[data-bh-jevc-badge="official"]')) && !(await p.$('[data-bh-jevc-badge="not-default"]')), '');
  const colours = await p.$$eval('[data-bh-jevc-bars] .bh-jevc-bar', (e) => new Set(e.map((x) => getComputedStyle(x).backgroundColor)).size);
  check(`${tag}: bars coloured by type (>= 4 colours)`, colours >= 4, colours);
  const links = await p.$$eval('[data-bh-jevc-bars] a[data-bh-jev-link]', (e) => e.map((x) => x.href));
  check(`${tag}: every system in the chart links out`, links.length === a.systems.length && links.every((h) => h.startsWith('https://')), links.length);
  for (const [id, [w, name]] of Object.entries(PRESETS)) {
    await p.click(`[data-bh-jevc-preset="${id}"]`); await p.waitForTimeout(250);
    const off = id !== 'balanced';
    check(`${tag}: preset ${id} title`, (await title()) === name, await title());
    check(`${tag}: preset ${id} re-ranks`, JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(expectOrder(w)), await bars());
    check(`${tag}: preset ${id} not-default state`, off === !!(await p.$('[data-bh-jevc-badge="not-default"]')) && off === !!(await p.$('[data-bh-jevc-reset]')) && off === /not the official/.test(await header()), await header());
    if (id === 'cost') await p.screenshot({ path: `${OUT}/${tag}-cost.png`, fullPage: false });
  }
  await p.click('[data-bh-jevc-preset="cost"]'); await p.waitForTimeout(200);
  check(`${tag}: URL carries the weighting`, p.url().endsWith('?w=20-20-60'), p.url());
  await p.click('[data-bh-jevc-reset]'); await p.waitForTimeout(200);
  check(`${tag}: reset returns to the official view and a clean URL`, (await title()).includes('Balanced 33:33:33') && !p.url().includes('?'), p.url());
  await p.goto(`${BASE}/jev-models?w=50-10-40`, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  check(`${tag}: shared custom URL restores, labelled not official`, (await title()) === 'Custom weights (50:10:40) — not the official JevBench Main Composite Score' && JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(expectOrder([0.5, 0.1, 0.4])), await title());
  check(`${tag}: no horizontal overflow`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), '');
  await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle' });
  await (await p.$('[data-bh-jevc-hero]')).screenshot({ path: `${OUT}/${tag}-default.png` });
  check(`${tag}: no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const failed = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verify-cr-87.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), checks }, null, 1));
for (const f of failed) console.log('FAIL', f.name, f.detail.slice(0, 300));
console.log(`${checks.length - failed.length}/${checks.length}`);
process.exit(failed.length ? 1 : 0);
