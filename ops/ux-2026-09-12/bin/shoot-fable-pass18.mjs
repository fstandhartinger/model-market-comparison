// Fable pass-18 screenshot matrix: what changed since pass 17 — iterations 73–77 (CR-25.4/25.5/36.3 = F-94 Options
// regional chips + Models/Providers/Labs comboboxes; CR-36.1/36.2 = F-95 Compare picker; CR-26.1 = F-96 Charts value map;
// CR-25.6 category scores; CR-38.2/38.3 = F-98 Saturated/Judged tags; CR-30.1 self-reported; CR-34.2 OpenRouter boards;
// CR-28.2 DesignArena), with the focus on the Benchmarks page (CR-1.10), plus the standing Simple/Guided/Advanced/
// Benchmaxxing/model-page sweep. Usage: node shoot-fable-pass18.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260916-pass18';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, text: document.body.innerText.slice(0, 160) }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const settle = async () => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1200); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const recEl = async (name, loc) => { try { await loc.first().screenshot({ path: `${OUT}/${tag}-${name}.png` }); metrics.shots[`${tag}-${name}`] = 'element'; } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), sh: el.scrollHeight, vw: innerWidth, vh: innerHeight }; }).catch(() => null);

  // ---- Benchmarks page (the focus) ----
  await step('benchmarks', async () => {
    await go('/benchmarks'); await p.waitForTimeout(1500); await rec('benchmarks'); await rec('benchmarks-full', true);
    metrics.shots[`${tag}-bm-geom`] = await p.evaluate(() => {
      const t = document.querySelector('table'); const r = t?.getBoundingClientRect();
      const tags = {}; document.querySelectorAll('[data-tag]').forEach((e) => { const k = e.getAttribute('data-tag'); tags[k] = (tags[k] || 0) + 1; });
      const groups = [...document.querySelectorAll('tr.bh-matrix-group')].map((g) => g.innerText.replace(/\s+/g, ' ').slice(0, 90));
      const hero = [...document.querySelectorAll('tr.bh-matrix-hero')].map((g) => g.innerText.replace(/\s+/g, ' ').slice(0, 120));
      const firstRows = [...document.querySelectorAll('tbody tr')].filter((r) => !r.classList.contains('bh-matrix-group')).slice(0, 6).map((r) => r.innerText.replace(/\s+/g, ' ').slice(0, 160));
      const head = [...document.querySelectorAll('thead th')].map((th) => ({ t: th.innerText.replace(/\s+/g, ' ').slice(0, 60), w: Math.round(th.getBoundingClientRect().width) }));
      const self = [...document.querySelectorAll('[data-self-reported], .bh-self-reported, [title*="self-reported" i], [aria-label*="self-reported" i]')].length;
      const selfText = [...document.querySelectorAll('td')].filter((c) => /self/i.test(c.innerText)).slice(0, 3).map((c) => c.innerText.replace(/\s+/g, ' ').slice(0, 80));
      const counts = [...document.querySelectorAll('p, span, div')].map((e) => e.childElementCount === 0 ? e.innerText : '').filter((s) => /benchmarks across|categor/i.test(s)).slice(0, 3);
      const presets = [...document.querySelectorAll('[role=group] button, [role=radiogroup] button, [role=tablist] button')].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 30);
      const tallCell = Math.max(...[...document.querySelectorAll('tbody td')].slice(0, 400).map((c) => Math.round(c.getBoundingClientRect().height)));
      return { tableW: r && Math.round(r.width), scrollW: document.documentElement.scrollWidth, vw: innerWidth, rows: document.querySelectorAll('tbody tr').length, groups, hero, tags, firstRows, head, self, selfText, counts, presets, tallCell, h1: document.querySelector('h1')?.innerText, intro: [...document.querySelectorAll('main p')].slice(0, 3).map((e) => e.innerText.slice(0, 220)) };
    });
    const tbl = p.locator('table').first(); if (await tbl.count()) { await recEl('benchmarks-table-top', tbl); }
    // the name column crops with tags (desktop: first 14 rows)
    const rowsWithTags = p.locator('tbody tr').filter({ has: p.locator('[data-tag="saturated"], [data-tag="judged"]') });
    if (await rowsWithTags.count()) { await rowsWithTags.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('benchmarks-tagged-rows'); metrics.shots[`${tag}-tagged-rows`] = await rowsWithTags.evaluateAll((rs) => rs.slice(0, 5).map((r) => r.innerText.replace(/\s+/g, ' ').slice(0, 200))); }
    // one (i) tooltip on a benchmark row + one category header (i)
    const info = p.locator('tbody tr:not(.bh-matrix-group) button[aria-haspopup], tbody tr:not(.bh-matrix-group) [data-info], tbody tr .bh-info').first();
    if (await info.count()) { await info.scrollIntoViewIfNeeded(); if (mobile) await info.tap(); else await info.hover(); await p.waitForTimeout(600); await rec('benchmarks-row-info'); metrics.shots[`${tag}-row-info-text`] = (await p.locator('[role=tooltip], [role=dialog]').last().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500); await p.keyboard.press('Escape'); if (mobile) await p.touchscreen.tap(10, 300); await p.waitForTimeout(300); }
    const ginfo = p.locator('tr.bh-matrix-group button[aria-haspopup], tr.bh-matrix-group [data-info], tr.bh-matrix-group .bh-info').first();
    if (await ginfo.count()) { await ginfo.scrollIntoViewIfNeeded(); if (mobile) await ginfo.tap(); else await ginfo.hover(); await p.waitForTimeout(600); await rec('benchmarks-group-info'); metrics.shots[`${tag}-group-info-text`] = (await p.locator('[role=tooltip], [role=dialog]').last().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500); await p.keyboard.press('Escape'); if (mobile) await p.touchscreen.tap(10, 300); await p.waitForTimeout(300); }
    // bar chart section
    const chart = p.locator('section[aria-label*="chart" i], [data-benchmark-chart], .bh-bench-chart, figure').first(); if (await chart.count()) { await chart.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await recEl('benchmarks-chart', chart); metrics.shots[`${tag}-bm-chart`] = await box(chart); }
    // scroll to the middle and bottom of the table
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.45)); await p.waitForTimeout(400); await rec('benchmarks-mid');
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(400); await rec('benchmarks-bottom');
  });
  await step('benchmarks-result', async () => {
    await go('/benchmarks'); await p.waitForTimeout(800);
    const cell = p.locator('tbody tr:not(.bh-matrix-group):not(.bh-matrix-hero) td a[href*="/benchmarks/result"]').first();
    if (await cell.count()) { await cell.scrollIntoViewIfNeeded(); await cell.click(); await p.waitForLoadState('domcontentloaded'); await settle(); await rec('benchmarks-result'); await rec('benchmarks-result-full', true); metrics.shots[`${tag}-result-text`] = await p.evaluate(() => ({ h1: document.querySelector('h1')?.innerText, h2: [...document.querySelectorAll('h2')].map((e) => e.innerText.slice(0, 60)), text: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 700) })); }
  });

  // ---- Options panel (F-94) ----
  await step('options', async () => {
    await go('/'); const btn = p.locator('header button[data-bh-filters-toggle]').first(); if (await btn.count()) {
      await btn.click(); await p.locator('#global-filters').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}); await p.waitForTimeout(500); await rec('options');
      const d = p.locator('#global-filters');
      metrics.shots[`${tag}-options-geom`] = await d.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), sh: el.scrollHeight, vh: innerHeight, headings: [...el.querySelectorAll('h2, h3, h4, legend, summary, [class*=eyebrow]')].map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 60)).slice(0, 30), chips: [...el.querySelectorAll('[aria-pressed]')].map((e) => `${e.innerText.trim()}=${e.getAttribute('aria-pressed')}`).slice(0, 40), combos: [...el.querySelectorAll('[data-bh-combobox-trigger]')].map((e) => ({ t: e.innerText.replace(/\s+/g, ' '), w: Math.round(e.getBoundingClientRect().width) })), selects: [...el.querySelectorAll('select')].map((s) => s.getAttribute('aria-label') || s.id || s.name).slice(0, 12), scoreOpts: [...(el.querySelector('select[aria-label*="core" i], select#score, select[name=score]')?.options ?? [])].map((o) => o.text).slice(0, 20) }; }).catch(() => null);
      await recEl('options-el', d);
      const reg = d.locator('text=/Hosted in/').first(); if (await reg.count()) { await reg.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('options-regional'); }
      const trig = d.locator('[data-bh-combobox-trigger="Providers"]').first(); if (await trig.count()) { await trig.scrollIntoViewIfNeeded(); await trig.click(); await p.waitForTimeout(500); await rec('options-combobox'); const lb = p.locator('[role=listbox][aria-label="Providers"]').first(); metrics.shots[`${tag}-combobox-geom`] = await box(lb); metrics.shots[`${tag}-combobox-pop`] = await box(lb.locator('xpath=ancestor::*[@data-bh-combobox][1]')); const inp = p.locator('input[aria-label^="Search providers"]').first(); if (await inp.count()) { await inp.fill('chu'); await p.waitForTimeout(400); await rec('options-combobox-search'); metrics.shots[`${tag}-combobox-search`] = await lb.locator('[role=option]').allInnerTexts().catch(() => []); } await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
      await p.evaluate(() => { const el = document.querySelector('#global-filters'); if (el) el.scrollTop = el.scrollHeight; }); await p.waitForTimeout(300); await rec('options-scrolled');
    }
  });

  // ---- Compare picker (F-95) ----
  await step('compare', async () => {
    await go('/compare'); await p.waitForTimeout(1500); await rec('compare'); await rec('compare-full', true);
    const inp = p.locator('input[role=combobox]').first(); if (await inp.count()) {
      await inp.scrollIntoViewIfNeeded(); await inp.click(); await p.waitForTimeout(600); await rec('compare-picker-empty');
      metrics.shots[`${tag}-picker-empty`] = await p.evaluate(() => { const ul = [...document.querySelectorAll('[role=listbox]')].find((u) => u.offsetParent); const r = ul?.getBoundingClientRect(); return { heading: ul?.getAttribute('aria-label'), box: r && [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], sh: ul?.scrollHeight, n: ul?.querySelectorAll('[role=option]').length, first: [...(ul?.querySelectorAll('[role=option]') ?? [])].slice(0, 4).map((o) => ({ t: o.innerText.replace(/\s+/g, ' ').slice(0, 120), h: Math.round(o.getBoundingClientRect().height) })), vw: innerWidth, vh: innerHeight }; });
      const active = mobile ? p.locator('input[aria-label="Search models"]').first() : inp; await (await active.count() ? active : inp).fill('deep'); await p.waitForTimeout(500); await rec('compare-picker-typing');
      metrics.shots[`${tag}-picker-typing`] = await p.evaluate(() => { const ul = [...document.querySelectorAll('[role=listbox]')].find((u) => u.offsetParent); return { heading: ul?.getAttribute('aria-label'), n: ul?.querySelectorAll('[role=option]').length, first: [...(ul?.querySelectorAll('[role=option]') ?? [])].slice(0, 4).map((o) => o.innerText.replace(/\s+/g, ' ').slice(0, 120)) }; });
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    }
    const radar = p.locator('#benchmark-radar').first(); if (await radar.count()) { await radar.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await recEl('compare-radar', radar); }
    const tbl = p.locator('table').first(); if (await tbl.count()) { await tbl.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await recEl('compare-table', tbl); metrics.shots[`${tag}-compare-table`] = await p.evaluate(() => ({ cols: [...document.querySelectorAll('table thead th')].map((th) => Math.round(th.getBoundingClientRect().width)).slice(0, 8), rows: document.querySelectorAll('table tbody tr').length, chips: [...document.querySelectorAll('[data-compare-model], .bh-chip')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).slice(0, 6), variant: [...document.querySelectorAll('td[title*="variant" i], [data-variant]')].slice(0, 3).map((e) => e.getAttribute('title') || e.getAttribute('data-variant')) })); }
  });

  // ---- Charts value map (F-96) ----
  await step('charts', async () => {
    await go('/charts'); await p.waitForTimeout(1500); await rec('charts'); await rec('charts-full', true);
    const map = p.locator('.bh-value-map').first(); if (await map.count()) { await map.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); const sec = map.locator('xpath=ancestor::section[1]'); await recEl('charts-map', (await sec.count()) ? sec : map); metrics.shots[`${tag}-charts-map`] = await p.evaluate(() => { const m = document.querySelector('.bh-value-map'); const r = m?.getBoundingClientRect(); const sec = m?.closest('section'); return { w: r && Math.round(r.width), h: r && Math.round(r.height), yTicks: [...(m?.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value') ?? [])].map((t) => t.textContent), xTicks: [...(m?.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-value') ?? [])].map((t) => t.textContent), labels: m?.querySelectorAll('text.bh-map-label, [data-map-label]').length, head: sec?.querySelector('h2')?.innerText, controls: [...(sec?.querySelectorAll('select, input[type=range], button[aria-label]') ?? [])].map((e) => e.getAttribute('aria-label') || e.tagName).slice(0, 10), caption: [...(sec?.querySelectorAll('p') ?? [])].map((e) => e.innerText.slice(0, 200)).slice(0, 3), cog: !!sec?.querySelector('button[aria-label="Chart settings"]') }; }); }
  });

  // ---- standing sweep ----
  await step('simple', async () => {
    await go('/'); await rec('simple'); await rec('simple-full', true);
    const card = p.locator('.bh-value-map').first(); if (await card.count()) { const sec = card.locator('xpath=ancestor::section[1]'); await recEl('simple-card', (await sec.count()) ? sec : card); }
    const tbl = p.locator('table').filter({ has: p.locator('tr.bh-ranking-row') }).first(); if (await tbl.count()) { await recEl('simple-table', tbl); metrics.shots[`${tag}-table-head`] = await p.evaluate(() => [...document.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\s+/g, ' ')).slice(0, 8)); }
    const s2 = p.locator('#benchmarks').first(); if (await s2.count()) { await s2.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800); await rec('simple-section2'); await recEl('simple-section2-el', s2); metrics.shots[`${tag}-section2-geom`] = await s2.evaluate((el) => { const tags = {}; el.querySelectorAll('[data-tag]').forEach((e) => { const k = e.getAttribute('data-tag'); tags[k] = (tags[k] || 0) + 1; }); return { rows: el.querySelectorAll('tbody tr').length, hero: el.querySelectorAll('tr.bh-matrix-hero').length, groups: el.querySelectorAll('tr.bh-matrix-group').length, tags, outliers: [...el.querySelectorAll('td [data-outlier], td .bh-outlier')].map((t) => t.innerText).slice(0, 10), head: el.querySelector('h2')?.innerText, intro: [...el.querySelectorAll('p')].slice(0, 3).map((e) => e.innerText.slice(0, 200)), taggedRows: [...el.querySelectorAll('tbody tr')].filter((r) => r.querySelector('[data-tag]')).slice(0, 4).map((r) => r.querySelector('th, td')?.innerText.replace(/\s+/g, ' ').slice(0, 100)) }; }); }
  });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); await rec('guided-full', true); metrics.shots[`${tag}-guided-text`] = await p.evaluate(() => document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 500)); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1200); await rec('advanced'); await rec('advanced-full', true); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1500); await rec('benchmaxxing'); await rec('benchmaxxing-full', true); });
  await step('model', async () => { await go('/models/claude-fable-5.1%3A%3Ahigh'); await rec('model'); await rec('model-full', true); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.text != null ? `${v.w}x${v.h}` : JSON.stringify(v).slice(0, 900)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
