// Fable pass-14 screenshot matrix + metrics. Usage: node shoot-fable-pass5.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass14';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const shot = async (p, name, full = false) => { await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, rows: document.querySelectorAll('tbody tr').length, text: document.body.innerText.slice(0, 400) }));
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  // F-66: record page errors and console errors per context, so an error-boundary shot carries its cause.
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ at: new Date().toISOString(), url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 500), stack: String(e.stack || '').slice(0, 1200) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ at: new Date().toISOString(), url: p.url(), type: 'console', message: m.text().slice(0, 500) }); });
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(700); };
  const rec = async (name, full = false) => { await shot(p, `${tag}-${name}`, full); metrics.shots[`${tag}-${name}`] = await measure(p); };
  if (!process.env.SUPP) { await go('/'); await rec('simple'); await rec('simple-full', true);
  // nudge slider to reveal histogram
  try { const r = p.locator('input[type=range]').first(); await r.focus(); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300); await rec('simple-slider-moved'); await p.keyboard.press('ArrowRight'); } catch (e) { metrics.shots[`${tag}-slider-err`] = String(e); }
  try { await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(900); await rec('advanced'); await rec('advanced-full', true);
    const exp = p.locator('tbody tr button, tbody tr [aria-expanded]').first(); if (await exp.count()) { await exp.click(); await p.waitForTimeout(500); await rec('advanced-row-expanded'); await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
    const fb = p.getByRole('button', { name: /filters/i }).first(); if (await fb.count()) { await fb.click(); await p.waitForTimeout(600); await rec('filters'); await rec('filters-full', true); await p.keyboard.press('Escape'); }
  } catch (e) { metrics.shots[`${tag}-advanced-err`] = String(e); }
  try { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(700); await rec('guided-1');
    for (let i = 2; i <= 5; i++) { const btn = p.getByRole('button', { name: /^(Continue|See results|See the models|Show results|Next)/i }).first(); if (!(await btn.count())) break; await btn.click(); await p.waitForTimeout(500); await rec(`guided-${i}`); }
  } catch (e) { metrics.shots[`${tag}-guided-err`] = String(e); }
  } else { await go('/'); try { const fb = p.getByRole('button', { name: /filters/i }).first(); if (await fb.count()) { await fb.click(); await p.waitForTimeout(600); await rec('filters'); await rec('filters-full', true); await p.keyboard.press('Escape'); } else { metrics.shots[`${tag}-filters-err`] = 'no button'; } } catch (e) { metrics.shots[`${tag}-filters-err`] = String(e); }
  try { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(700); for (let i = 2; i <= 5; i++) { const btn = p.getByRole('button', { name: /^(Continue|See results|See the models|Show results|Next)/i }).first(); if (!(await btn.count())) break; await btn.click(); await p.waitForTimeout(700); if (i === 5) { await rec('guided-5'); await rec('guided-5-full', true); } } } catch (e) { metrics.shots[`${tag}-guided-err`] = String(e); } }
  if (!process.env.SUPP) { await go('/benchmaxxing'); await rec('benchmaxxing'); await rec('benchmaxxing-full', true);
  await go('/models/claude-opus-5%3A%3Ahigh'); await rec('model'); await rec('model-full', true);
  await go('/compare'); await rec('compare'); await rec('compare-full', true);
  await go('/benchmarks'); await rec('benchmarks'); await rec('benchmarks-full', true);
  await go('/charts'); await rec('charts'); await rec('charts-full', true); }
  // E2 boards: source-labelled benchmarks (Vals Index v2, ApprenticeBench) in their default state
  try { await go('/benchmarks'); // pass 12: the first select is now Category; the benchmark list is the second
    const sel = p.locator('select').nth(1); const opts = await sel.locator('option').allTextContents(); metrics.shots[`${tag}-bench-options`] = opts.join(' | ');
    for (const [key, re] of [['vals', /vals/i], ['apprentice', /apprentice/i], ['frontiercode', /frontiercode/i], ['cursorbench', /cursorbench/i], ['realswe', /real-?swe/i]]) { const o = opts.find(t => re.test(t)); if (!o) continue; await sel.selectOption({ label: o }); await p.waitForTimeout(900); await rec(`benchmarks-${key}`); }
  } catch (e) { metrics.shots[`${tag}-bench-err`] = String(e); }
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics${process.env.SUPP ? '-supp' : ''}.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : `${v.w}x${v.h} rows=${v.rows}`}`).join('\n'));
