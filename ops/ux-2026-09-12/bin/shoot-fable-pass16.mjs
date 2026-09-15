// Fable pass-16 screenshot matrix: what changed since pass 15 — Benchmarks page after F-83, the One-benchmark
// boards (E2), the H3 bridge disclosure (P2 gap 4), model page speed/context (P2-GAP-01) — plus the standing
// sweep (Simple, Advanced, Guided, Benchmaxxing). Usage: node shoot-fable-pass16.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass16';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, text: document.body.innerText.slice(0, 200) }));
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(800); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };
  await step('benchmarks', async () => {
    await go('/benchmarks'); await rec('benchmarks'); await rec('benchmarks-full', true);
    metrics.shots[`${tag}-benchmarks-geom`] = await p.evaluate(() => {
      const th = document.querySelector('table.bh-matrix thead'); const cell = document.querySelector('table.bh-matrix tbody td');
      return { theadTop: th && Math.round(th.getBoundingClientRect().top + scrollY), firstCellTop: cell && Math.round(cell.getBoundingClientRect().top + scrollY), h1: document.querySelector('h1')?.innerText, head: [...document.querySelectorAll('main p, main .bh-muted')].slice(0, 3).map((e) => e.innerText.slice(0, 160)) };
    });
  });
  await step('one-benchmark', async () => {
    await go('/benchmarks'); const t = p.getByRole('link', { name: 'One benchmark' }).first(); if (await t.count()) { await t.click(); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800); await rec('one-benchmark'); }
    const sel = p.locator('select').filter({ has: p.locator('option', { hasText: /BullshitBench/i }) }).first();
    if (await sel.count()) { const opts = await sel.locator('option').allTextContents(); const v = await sel.locator('option', { hasText: /BullshitBench/i }).first().getAttribute('value'); metrics.shots[`${tag}-bench-select`] = { n: opts.length, v }; await sel.selectOption(v); await p.waitForTimeout(1200); await rec('one-benchmark-bullshit'); await rec('one-benchmark-bullshit-full', true); }
  });
  await step('simple', async () => { await go('/'); await rec('simple'); await rec('simple-full', true); });
  await step('advanced', async () => {
    await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(900); await rec('advanced');
    if (kind === 'desktop') {
      const d = p.locator('details').filter({ has: p.locator('summary', { hasText: /Better than/ }) }).first();
      if (await d.count()) { await d.locator('summary').click(); await p.waitForTimeout(500); await rec('advanced-better-than');
        const sels = d.locator('select'); metrics.shots[`${tag}-better-selects`] = await sels.count();
        const modelSel = sels.first(); const opts = await modelSel.locator('option').allTextContents(); metrics.shots[`${tag}-better-options`] = { n: opts.length, sample: opts.slice(0, 6), dup: opts.length - new Set(opts).size };
        const opus = opts.find((o) => /Opus 4\.7/i.test(o)); if (opus) { await modelSel.selectOption({ label: opus }); await p.waitForTimeout(900); await rec('advanced-better-than-opus47'); metrics.shots[`${tag}-better-panel-text`] = (await d.innerText()).slice(0, 900); } }
    } else {
      const rb = p.getByRole('button', { name: /^Refine/ }).first(); if (await rb.count()) { await rb.click(); await p.waitForTimeout(600); await rec('advanced-refine');
        const sels = p.locator('[role=dialog] select'); const n = await sels.count(); for (let i = 0; i < n; i++) { const opts = await sels.nth(i).locator('option').allTextContents(); const opus = opts.find((o) => /Opus 4\.7/i.test(o)); if (opus) { await sels.nth(i).selectOption({ label: opus }); await p.waitForTimeout(900); await rec('advanced-refine-opus47'); metrics.shots[`${tag}-better-panel-text`] = (await p.locator('[role=dialog]').innerText()).slice(0, 900); break; } } }
    }
  });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(700); await rec('guided-1'); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await rec('benchmaxxing'); await rec('benchmaxxing-full', true); });
  await step('model', async () => { await go('/models/claude-opus-5%3A%3Ahigh'); await rec('model'); await rec('model-full', true); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null ? `${v.w}x${v.h}` : JSON.stringify(v).slice(0, 600)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors));
