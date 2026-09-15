// Fable pass-15 (CR-1.10) screenshot matrix: Benchmarks page, cell detail, Simple landing section 2, mobile header.
// Usage: node shoot-fable-pass15.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass15';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, rows: document.querySelectorAll('table.bh-matrix tbody tr').length, text: document.body.innerText.slice(0, 300) }));
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 500) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ url: p.url(), type: 'console', message: m.text().slice(0, 500) }); });
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(800); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  try {
    await go('/benchmarks'); await rec('benchmarks'); await rec('benchmarks-full', true);
    // matrix geometry
    metrics.shots[`${tag}-benchmarks-geom`] = await p.evaluate(() => {
      const wrap = document.querySelector('.bh-matrix-wrap'); const t = document.querySelector('table.bh-matrix');
      const th = [...document.querySelectorAll('table.bh-matrix thead th')].map((e) => ({ w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), text: e.innerText.replace(/\n/g, ' / ').slice(0, 60) }));
      const stub = document.querySelector('table.bh-matrix tbody th.bh-matrix-stub');
      const chart = document.querySelector('[aria-label*="chart" i], .bh-bars, figure');
      return { wrapW: wrap?.clientWidth, wrapScrollW: wrap?.scrollWidth, tableW: t?.getBoundingClientRect().width, th, stubW: stub && Math.round(stub.getBoundingClientRect().width), groups: [...document.querySelectorAll('.bh-matrix-group button')].map((b) => b.innerText.replace(/\n/g, ' ')), chartTop: chart && Math.round(chart.getBoundingClientRect().top + scrollY), docH: document.documentElement.scrollHeight };
    });
    // Rows preset menu open
    const rowsBtn = p.getByRole('button', { name: /^Rows/ }).first(); if (await rowsBtn.count()) { await rowsBtn.click(); await p.waitForTimeout(400); await rec('benchmarks-rows-menu'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
    const modelsBtn = p.getByRole('button', { name: /^Models/ }).first(); if (await modelsBtn.count()) { await modelsBtn.click(); await p.waitForTimeout(400); await rec('benchmarks-models-menu'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
    // Important preset via URL
    await go('/benchmarks?rows=important'); await rec('benchmarks-important'); await rec('benchmarks-important-full', true);
    // chart: scroll into view
    const chart = p.locator('.bh-bars, [aria-label*="chart" i]').first(); if (await chart.count()) { await chart.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('benchmarks-chart'); }
    // pick from chart open
    await go('/benchmarks'); const pick = p.locator('details.bh-pickpanel summary').first(); if (await pick.count()) { await pick.click(); await p.waitForTimeout(600); await pick.scrollIntoViewIfNeeded(); await rec('benchmarks-pick'); }
    const rp = p.locator('details.bh-rowpicker summary').first(); if (await rp.count()) { await rp.click(); await p.waitForTimeout(400); await rp.scrollIntoViewIfNeeded(); await rec('benchmarks-rowpicker'); }
    // cell detail page
    await go('/benchmarks'); const link = p.locator('a.bh-matrix-link').first(); const href = await link.getAttribute('href'); metrics.shots[`${tag}-cell-href`] = href;
    if (href) { await go(href); await rec('cell-detail'); await rec('cell-detail-full', true); }
    // Simple landing section 2 (CR-7)
    await go('/'); await rec('simple'); await rec('simple-full', true);
    const s2 = p.locator('section[aria-label*="enchmark"], #benchmarks, [id*="benchmark"]').first(); if (await s2.count()) { await s2.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('simple-section2'); }
    // header
    metrics.shots[`${tag}-header`] = await p.evaluate(() => [...document.querySelectorAll('header a, header button')].map((e) => ({ t: e.innerText.trim().slice(0, 30), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })));
  } catch (e) { metrics.shots[`${tag}-err`] = String(e).slice(0, 400); }
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v.h != null ? `${v.w}x${v.h} rows=${v.rows}` : JSON.stringify(v).slice(0, 500)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors));
