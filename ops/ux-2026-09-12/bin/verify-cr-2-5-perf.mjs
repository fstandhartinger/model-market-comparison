// Acceptance for CR-2.5 (shareable URL: models, row preset and filters reproduce the view) and a
// measurement for CR-1.11 ("All" table with 10 models renders without jank; CLS < 0.1).
// Lighthouse is not installed on Sandy and the disk is ~90 % full, so CLS and long tasks are measured
// in the page with PerformanceObserver (the same layout-shift entries Lighthouse sums).
// Usage: node verify-cr-2-5-perf.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter53-cr-2-5-perf/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const metrics = {};
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };

const view = () => {
  const cols = [...document.querySelectorAll('table.bh-matrix thead th.bh-matrix-model .bh-matrix-name a')].map((a) => decodeURIComponent(a.getAttribute('href').replace('/models/', '')));
  const rows = document.querySelectorAll('table.bh-matrix tbody tr:not(.bh-matrix-group)').length;
  const status = document.querySelector('section[aria-label="Benchmark comparison"] [role="status"]')?.textContent.replace(/\s+/g, ' ').trim();
  return { cols, rows, status, search: location.search };
};
const observe = () => {
  window.__cls = 0; window.__long = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });
};

for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`;
  const ctx = async () => {
    const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
    return c;
  };
  // ── CR-2.5: build a view with a filter, a model preset and a row preset; open its URL elsewhere.
  const c1 = await ctx();
  const p = await c1.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(BASE + '/benchmarks', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const before = await p.evaluate(view);
  // Turn on "Open weights only" through the settings store the filters sheet writes (the sheet is hidden
  // on /benchmarks), then reload so the stored setting is what the page starts from.
  await p.evaluate(() => { const k = 'mmc.settings.v9'; const s = JSON.parse(localStorage.getItem(k) || '{}'); s.openOnly = true; localStorage.setItem(k, JSON.stringify(s)); });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  let s = await p.evaluate(view);
  check(`${tag} CR-2.5 a non-default filter appears in the URL as ?f=`, /[?&]f=[^&]*openOnly%3A1|[?&]f=[^&]*openOnly:1/.test(s.search), s.search);
  check(`${tag} the filter changes the automatic columns`, s.cols.join() !== before.cols.join(), `${before.cols.length} → ${s.cols.length}`);
  await p.locator('.bh-preset[data-preset-kind="rows"] > button').click();
  await p.locator('.bh-preset[data-preset-kind="rows"] [role="dialog"]').getByRole('button', { name: /^Important/ }).click();
  await p.waitForTimeout(400);
  s = await p.evaluate(view);
  const shared = await p.evaluate(() => location.href);
  // Fresh browser, and one whose own stored settings disagree: the URL must win.
  for (const [label, stored] of [['fresh browser', null], ['browser with other stored filters', { openOnly: false, teeOnly: true }]]) {
    const c2 = await ctx();
    if (stored) await c2.addInitScript((v) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('mmc.settings.v9', JSON.stringify(v)); sessionStorage.setItem('seeded', '1'); } } catch {} }, stored);
    const q = await c2.newPage();
    await q.goto(shared, { waitUntil: 'networkidle' });
    await q.waitForTimeout(1200);
    const t = await q.evaluate(view);
    const settings = await q.evaluate(() => JSON.parse(localStorage.getItem('mmc.settings.v9') || '{}'));
    check(`${tag} CR-2.5 shared URL reproduces columns, rows and filters (${label})`, t.cols.join() === s.cols.join() && t.rows === s.rows && settings.openOnly === true && (!stored || settings.teeOnly === false), `${t.cols.length} cols · ${t.rows} rows · openOnly=${settings.openOnly} teeOnly=${settings.teeOnly}`);
    await c2.close();
  }
  check(`${tag} no page errors (CR-2.5)`, errors.length === 0, errors.join(' | '));
  await c1.close();

  // ── CR-1.11: "All" rows × 10 models, measured from navigation.
  const c3 = await ctx();
  const r = await c3.newPage();
  await r.addInitScript(observe);
  await r.goto(BASE + '/benchmarks', { waitUntil: 'networkidle' });
  await r.waitForTimeout(600);
  await r.locator('section[aria-label="Benchmark comparison"] select').first().selectOption('10');
  await r.waitForTimeout(500);
  const ten = (await r.evaluate(view)).cols;
  const url = `${BASE}/benchmarks?models=${encodeURIComponent(ten.join(','))}`;
  const c4 = await ctx();
  const m = await c4.newPage();
  await m.addInitScript(observe);
  const t0 = Date.now();
  await m.goto(url, { waitUntil: 'load' });
  await m.waitForFunction((n) => document.querySelectorAll('table.bh-matrix thead th.bh-matrix-model').length === n, ten.length, { timeout: 20000 });
  const tableMs = Date.now() - t0;
  await m.waitForLoadState('networkidle');
  await m.waitForTimeout(1500);
  // Interaction jank: collapse and reopen every group, switch presets.
  const g0 = Date.now();
  await m.evaluate(async () => { for (const btn of document.querySelectorAll('tr.bh-matrix-group button')) btn.click(); await new Promise((res) => requestAnimationFrame(() => res())); for (const btn of document.querySelectorAll('tr.bh-matrix-group button')) btn.click(); await new Promise((res) => requestAnimationFrame(() => res())); });
  const toggleMs = Date.now() - g0;
  const perf = await m.evaluate(() => ({ cls: Number(window.__cls.toFixed(4)), longTasks: window.__long, rows: document.querySelectorAll('table.bh-matrix tbody tr:not(.bh-matrix-group)').length, cells: document.querySelectorAll('table.bh-matrix td').length }));
  metrics[tag] = { ...perf, tableMs, toggleMs, models: ten.length };
  await m.screenshot({ path: `${OUT}/${tag}-ten-models.png` });
  check(`${tag} CR-1.11 ten models × All rows: CLS < 0.1`, ten.length === 10 && perf.cls < 0.1, JSON.stringify(metrics[tag]));
  check(`${tag} CR-1.11 no long task ≥ 200 ms after load, collapsing/reopening all groups < 500 ms`, perf.longTasks.every((d) => d < 200) && toggleMs < 500, `long tasks ${perf.longTasks.join(',') || 'none'} · toggle ${toggleMs} ms`);
  await c3.close(); await c4.close();
}
await b.close();
const passed = results.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, metrics, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
