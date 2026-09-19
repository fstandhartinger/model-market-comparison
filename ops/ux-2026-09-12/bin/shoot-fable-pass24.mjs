// Fable pass-24 screenshot matrix: what changed since pass 23 — the /jev-models page (CR-84 → CR-86 → CR-87 → CR-92, JevBench v1.2
// final: hero bar chart, weighting presets + custom sliders, axes table, views table, cost/method panels) and /jev-models/v1, plus the
// standard quick views (Simple, Advanced, Guided, Benchmaxxing, Benchmarks, model page). 1440/390 × light/dark. Geometry of the hero
// chart, the controls and the footnotes is measured because the pass-20 rule caps a visible footnote at two sentences.
// Usage: node shoot-fable-pass24.mjs <base> <out> [changed-only]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260919-pass24';
const CHANGED_ONLY = process.argv[4] === 'changed-only';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const footnotes = () => [...document.querySelectorAll('main p.bh-muted, main figcaption, main p.text-xs, main [data-bh-jevc-note]')].map((p) => { const r = p.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(p).lineHeight) || 16; const t = p.innerText.replace(/\s+/g, ' ').trim(); return { words: t.split(' ').length, sentences: (t.match(/[.!?](\s|$)/g) || []).length, h: Math.round(r.height), lines: Math.round(r.height / lh), w: Math.round(r.width), head: t.slice(0, 80) }; }).filter((f) => f.words > 12);
const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1200); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const recEl = async (name, loc) => { try { await loc.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await loc.first().screenshot({ path: `${OUT}/${tag}-${name}.png` }); metrics.shots[`${tag}-${name}`] = 'element'; } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };

  // ---- /jev-models: the whole page, then its pieces ----
  await step('jev', async () => {
    await go('/jev-models'); await rec('jev'); await rec('jev-full', true);
    metrics.shots[`${tag}-jev-footnotes`] = await p.evaluate(footnotes);
    metrics.shots[`${tag}-jev-geometry`] = await p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y + scrollY), h: Math.round(r.height), w: Math.round(r.width) }; };
      return { head: bx(q('.bh-page-head')), chart: bx(q('[data-bh-jev12-main-chart]')), controls: bx(q('[data-bh-jevc-controls]')), findings: bx(q('[data-bh-jev12-findings]')), table: bx(q('[data-bh-jev12-table]')), formula: bx(q('[data-bh-jev12-formula]')), views: bx(q('[data-bh-jev12-views]')), costs: bx(q('[data-bh-jev-costs]')), h1: bx(q('main h1')), title: q('[data-bh-jevc-title]')?.innerText, sub: q('[data-bh-jevc-subtitle]')?.innerText?.replace(/\s+/g, ' ').slice(0, 300), bars: [...document.querySelectorAll('[data-bh-jev12-bar]')].map((li) => ({ k: li.getAttribute('data-bh-jev12-bar'), s: li.getAttribute('data-bh-jevc-score'), rank: li.querySelector('[data-bh-jevc-rank]')?.getAttribute('data-bh-jevc-rank'), name: li.querySelector('span[title]')?.innerText?.replace(/\s+/g, ' ').slice(0, 60), nameW: Math.round(li.querySelector('span[title]')?.getBoundingClientRect().width || 0), nameH: Math.round(li.querySelector('span[title]')?.getBoundingClientRect().height || 0), barW: li.querySelector('.bh-jevc-bar')?.style.width, liH: Math.round(li.getBoundingClientRect().height), subs: li.querySelector('[data-bh-jevc-subs]')?.innerText?.replace(/\s+/g, ' ') })), tableHeads: [...document.querySelectorAll('[data-bh-jev12-table] thead th')].map((th) => th.innerText.replace(/\s+/g, ' ').trim().slice(0, 50)), tableW: q('[data-bh-jev12-table]')?.scrollWidth, wrapW: q('[data-bh-jev12-table]')?.parentElement?.clientWidth, presets: [...document.querySelectorAll('[data-bh-jevc-preset]')].map((b) => ({ id: b.getAttribute('data-bh-jevc-preset'), t: b.innerText.replace(/\s+/g, ' ').slice(0, 80), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), pressed: b.getAttribute('aria-pressed') })), headText: q('.bh-page-head')?.innerText?.replace(/\s+/g, ' ').slice(0, 900), findingsText: q('[data-bh-jev12-findings]')?.innerText?.replace(/\s+/g, ' ').slice(0, 900), legend: q('[data-bh-jevc-legend]')?.innerText?.replace(/\s+/g, ' ') };
    });
    await recEl('jev-head', p.locator('.bh-page-head'));
    await recEl('jev-chart', p.locator('[data-bh-jev12-main-chart]'));
    await recEl('jev-controls', p.locator('[data-bh-jevc-controls]'));
    await recEl('jev-findings', p.locator('[data-bh-jev12-findings]'));
    await recEl('jev-table', p.locator('[data-bh-jev12-table]').locator('xpath=ancestor::section[1]'));
    await recEl('jev-formula', p.locator('[data-bh-jev12-formula]'));
    await recEl('jev-views', p.locator('[data-bh-jev12-views]').locator('xpath=ancestor::section[1]'));
    await recEl('jev-costs', p.locator('[data-bh-jev-costs]'));
    // hover / tap an est. cost in the chart
    const est = p.locator('[data-bh-jev12-main-chart] [data-bh-jevc-usd]').filter({ hasText: 'est.' }).first();
    if (await est.count()) { if (!mobile) { await est.hover(); await p.waitForTimeout(1000); await rec('jev-est-hover'); } else { await est.tap().catch(() => {}); await p.waitForTimeout(700); await rec('jev-est-tap'); } }
  });
  // ---- a preset (Emphasis on Speed) → not-the-default state ----
  await step('jev-preset', async () => {
    await go('/jev-models');
    const btn = p.locator('[data-bh-jevc-preset="speed"]').first();
    if (await btn.count()) { await btn.scrollIntoViewIfNeeded(); await btn.click(); await p.waitForTimeout(900); }
    metrics.shots[`${tag}-jev-preset-state`] = await p.evaluate(() => ({ url: location.search, state: document.querySelector('[data-bh-jevc-controls]')?.getAttribute('data-bh-jevc-state'), chart: document.querySelector('[data-bh-jevc-chart]')?.getAttribute('data-bh-jevc-chart'), title: document.querySelector('[data-bh-jevc-title]')?.innerText, sub: document.querySelector('[data-bh-jevc-subtitle]')?.innerText?.replace(/\s+/g, ' ').slice(0, 300), badge: document.querySelector('[data-bh-jevc-badge]')?.innerText, deltas: [...document.querySelectorAll('[data-bh-jev12-main-chart] [data-bh-jevc-delta]')].map((d) => d.innerText).slice(0, 12), head: [...document.querySelectorAll('[data-bh-jev12-table] thead th')].slice(2, 3).map((th) => th.innerText.replace(/\s+/g, ' ')) }));
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    await recEl('jev-preset-chart', p.locator('[data-bh-jev12-main-chart]'));
    await recEl('jev-preset-controls', p.locator('[data-bh-jevc-controls]'));
    await recEl('jev-preset-table', p.locator('[data-bh-jev12-table]').locator('xpath=ancestor::section[1]'));
    // custom: open the Custom panel and move Cost to 60
    const sl = p.locator('[data-bh-jevc-slider="cost"]').first();
    const det = p.locator('[data-bh-jevc-custom-panel]').first();
    if (await det.count()) { await det.evaluate((d) => { d.open = true; }); await p.waitForTimeout(300); }
    if (await sl.count()) { await sl.evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '60'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(900); }
    metrics.shots[`${tag}-jev-custom-state`] = await p.evaluate(() => ({ url: location.search, title: document.querySelector('[data-bh-jevc-title]')?.innerText, summary: document.querySelector('[data-bh-jevc-custom-panel] summary')?.innerText, badge: document.querySelector('[data-bh-jevc-badge]')?.innerText }));
    await recEl('jev-custom-controls', p.locator('[data-bh-jevc-controls]'));
    await recEl('jev-custom-chart', p.locator('[data-bh-jev12-main-chart]'));
  });
  // ---- table sorted by cost, mobile sticky column ----
  await step('jev-sort', async () => {
    await go('/jev-models');
    const h = p.locator('[data-bh-jev12-sort="usd"]').first();
    if (await h.count()) { await h.scrollIntoViewIfNeeded(); await h.click(); await p.waitForTimeout(600); }
    await recEl('jev-table-sorted-usd', p.locator('[data-bh-jev12-table]').locator('xpath=ancestor::section[1]'));
    if (mobile) { const wrap = p.locator('[data-bh-jev12-table]').locator('xpath=ancestor::div[1]'); await wrap.evaluate((w) => { w.scrollLeft = 260; }); await p.waitForTimeout(400); await recEl('jev-table-scrolled', p.locator('[data-bh-jev12-table]').locator('xpath=ancestor::section[1]')); metrics.shots[`${tag}-jev-sticky`] = await p.evaluate(() => { const th = document.querySelector('[data-bh-jev12-table] tbody th.bh-jev-sticky'); const r = th?.getBoundingClientRect(); return th ? { x: Math.round(r.x), w: Math.round(r.width), pos: getComputedStyle(th).position } : null; }); }
  });
  // ---- expanded details: method, limits, credit ----
  await step('jev-details', async () => {
    await go('/jev-models');
    await p.evaluate(() => document.querySelectorAll('main details').forEach((d) => { d.open = true; }));
    await p.waitForTimeout(500);
    await recEl('jev-method-open', p.locator('#method'));
    await recEl('jev-credit-open', p.locator('#credit'));
    await recEl('jev-formula-open', p.locator('[data-bh-jev12-formula]'));
  });
  // ---- /jev-models/v1 (archived) ----
  await step('jev-v1', async () => { await go('/jev-models/v1'); await rec('jev-v1'); await rec('jev-v1-full', true); metrics.shots[`${tag}-jev-v1-geometry`] = await p.evaluate(() => ({ head: document.querySelector('.bh-page-head')?.innerText?.replace(/\s+/g, ' ').slice(0, 500), h2s: [...document.querySelectorAll('main h2')].map((h) => h.innerText.slice(0, 60)) })); });
  // ---- nav: where does the page live in the menu ----
  await step('nav', async () => {
    await go('/');
    if (mobile) { const btn = p.getByRole('button', { name: /menu/i }).first(); if (await btn.count()) { await btn.click(); await p.waitForTimeout(600); await rec('nav-open'); metrics.shots[`${tag}-nav-items`] = await p.evaluate(() => [...document.querySelectorAll('nav a, [role=dialog] a, header a')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40)); } }
    else { const more = p.getByRole('button', { name: /more/i }).first(); if (await more.count()) { await more.click(); await p.waitForTimeout(600); await rec('nav-more'); metrics.shots[`${tag}-nav-items`] = await p.evaluate(() => [...document.querySelectorAll('header a, header [role=menu] a, [role=menu] a')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40)); } }
  });
  if (CHANGED_ONLY) { await c.close(); continue; }
  await step('simple', async () => { await go('/'); await rec('simple'); await rec('simple-full', true); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); });
  await step('benchmarks', async () => { await go('/benchmarks'); await rec('benchmarks'); await rec('benchmarks-full', true); metrics.shots[`${tag}-bm-footnotes`] = await p.evaluate(footnotes); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); await rec('model-full', true); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 2500)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
