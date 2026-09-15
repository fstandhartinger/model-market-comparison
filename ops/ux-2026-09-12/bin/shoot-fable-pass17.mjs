// Fable pass-17 screenshot matrix: what changed since pass 16 — iteration 71's batch (CR-18/19…25/28.1/29/31/32/33/35):
// Simple (two-line slider label, ▼ pickers, column chart, outlier tags, simplified-list hint, (i) per benchmark, cogwheel,
// fitted Y axis, cost-cell tag inline, BETA tag, AA/Epoch credits), cost modal, Options dialog (renamed, company toggle moved),
// mobile More menu, Compare radar (opaque tooltip, zoom window, Full-Stack axis, equal columns), Benchmaxxing (one row per
// family, signal bar, master-detail report, jagged sentence, subtle spokes), plus the standing Advanced + model-page sweep.
// Usage: node shoot-fable-pass17.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass17';
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

  await step('simple', async () => {
    await go('/'); await rec('simple'); await rec('simple-full', true);
    metrics.shots[`${tag}-header-geom`] = await p.evaluate(() => { const h = document.querySelector('header'); const beta = document.querySelector('[data-beta-tag]'); const r = h?.getBoundingClientRect(); const rb = beta?.getBoundingClientRect(); return { headerH: r && Math.round(r.height), headerW: r && Math.round(r.width), beta: beta?.innerText, betaBox: rb && [Math.round(rb.left), Math.round(rb.top), Math.round(rb.width), Math.round(rb.height)], scrollW: document.documentElement.scrollWidth, headerText: h?.innerText.replace(/\s+/g, ' ').slice(0, 200) }; });
    metrics.shots[`${tag}-simple-labels`] = await p.evaluate(() => ({ score: document.querySelector('[data-label-picker="Capability score"]')?.innerText, sub: document.querySelector('[data-min-score-sub]')?.innerText, cost: document.querySelector('[data-label-picker="Cost measure"]')?.innerText, slider: document.querySelector('input[type=range][aria-label^="Minimum Capability Score"]')?.value, summary: [...document.querySelectorAll('p, .bh-muted')].map((e) => e.innerText).filter((t) => /model/.test(t)).slice(0, 3).map((t) => t.slice(0, 160)), yTicks: [...document.querySelectorAll('.bh-value-map .recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => t.textContent), xTicks: [...document.querySelectorAll('.bh-value-map .recharts-xAxis .recharts-cartesian-axis-tick-value')].map((t) => t.textContent), credits: [...document.querySelectorAll('a[href*="artificialanalysis.ai"], a[href*="epoch.ai"]')].map((a) => a.innerText.trim()).filter(Boolean).slice(0, 12), creditsN: document.querySelectorAll('a[href*="artificialanalysis.ai"], a[href*="epoch.ai"]').length }));
    // shortlist card crop
    const card = p.locator('.bh-value-map').first(); if (await card.count()) { const sec = card.locator('xpath=ancestor::section[1]'); await recEl('simple-card', (await sec.count()) ? sec : card); }
    // BETA note
    const beta = p.locator('[data-beta-tag]').first(); if (await beta.count()) { if (mobile) await beta.tap(); else await beta.hover(); await p.waitForTimeout(400); await recEl('beta-note', p.locator('header')); if (mobile) await p.touchscreen.tap(200, 600); else await p.mouse.move(700, 600); }
    // score picker menu
    const sb = p.locator('[data-label-picker="Capability score"]'); if (await sb.count()) { await sb.click(); await p.waitForTimeout(300); await rec('simple-score-menu'); metrics.shots[`${tag}-score-menu-items`] = await p.locator('[role=menu][aria-label="Capability score"] [role=menuitemradio]').allInnerTexts(); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
    const cb = p.locator('[data-label-picker="Cost measure"]'); if (await cb.count()) { await cb.click(); await p.waitForTimeout(300); await rec('simple-cost-menu'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
    // cogwheel
    const cog = p.locator('button[aria-label="Chart settings"]').first(); if (await cog.count()) { await cog.click(); await p.waitForTimeout(400); await rec('simple-chart-settings'); metrics.shots[`${tag}-chart-settings-text`] = (await p.locator('#bh-value-map-settings').innerText().catch(() => '')).slice(0, 400); await cog.click(); await p.waitForTimeout(200); }
    // overview table crop (cost cell tags)
    const tbl = p.locator('table').filter({ has: p.locator('tr.bh-ranking-row') }).first(); if (await tbl.count()) { await recEl('simple-table', tbl); metrics.shots[`${tag}-table-head`] = await p.evaluate(() => [...document.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\s+/g, ' ')).slice(0, 8)); metrics.shots[`${tag}-cost-cells`] = await p.evaluate(() => [...document.querySelectorAll('tr.bh-ranking-row')].filter((r) => r.offsetParent).slice(0, 6).map((r) => { const c = r.querySelector('td:last-child, [data-cost-cell]'); return r.innerText.replace(/\s+/g, ' ').slice(0, 120); })); }
    // cost modal
    const priceBtn = p.locator('tr.bh-ranking-row button[aria-haspopup="dialog"]').first(); if (await priceBtn.count()) { await priceBtn.click(); await p.waitForTimeout(700); await rec('cost-modal'); const dlg = p.locator('[role=dialog]').last(); metrics.shots[`${tag}-cost-modal-text`] = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1400); metrics.shots[`${tag}-cost-modal-geom`] = await dlg.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), sh: el.scrollHeight, words: el.innerText.split(/\s+/).length }; }).catch(() => null); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    // section 2: shortlist benchmarks (column chart + table)
    const s2 = p.locator('#benchmarks').first(); if (await s2.count()) { await s2.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800); await rec('simple-section2'); await recEl('simple-section2-el', s2); metrics.shots[`${tag}-section2-geom`] = await s2.evaluate((el) => { const r = el.getBoundingClientRect(); const chart = el.querySelector('[role=img]'); const rows = el.querySelectorAll('tbody tr'); const hero = el.querySelectorAll('tr.bh-matrix-hero'); const groups = el.querySelectorAll('tr.bh-matrix-group'); const tags = [...el.querySelectorAll('td [data-outlier], td .bh-outlier, td [data-tag]')].map((t) => t.innerText).slice(0, 10); return { h: Math.round(r.height), chart: chart?.getAttribute('aria-label')?.slice(0, 300), chartH: chart && Math.round(chart.getBoundingClientRect().height), rows: rows.length, hero: hero.length, groups: groups.length, tags, head: el.querySelector('h2')?.innerText, intro: [...el.querySelectorAll('p')].slice(0, 3).map((e) => e.innerText.slice(0, 200)), hint: document.querySelector('[data-simplified-hint], [role=status]')?.innerText }; }); const hint = p.locator('text=/simplified list/i').first(); if (await hint.count()) await rec('simple-hint'); }
  });
  await step('options', async () => {
    await go('/'); const btn = p.locator('header button[data-bh-filters-toggle]').first(); if (await btn.count()) { await btn.click(); await p.locator('#global-filters').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}); await p.waitForTimeout(500); await rec('options'); const d = p.locator('#global-filters'); metrics.shots[`${tag}-options-geom`] = await d.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), sh: el.scrollHeight, headings: [...el.querySelectorAll('h2, h3, h4, legend, summary, [class*=eyebrow]')].map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 60)).slice(0, 30), labels: [...el.querySelectorAll('label')].map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 50)).slice(0, 60), selects: el.querySelectorAll('select').length, inputs: el.querySelectorAll('input').length }; }).catch(() => null); await recEl('options-el', d); await p.evaluate(() => { const el = document.querySelector('#global-filters'); if (el) el.scrollTop = 900; }); await p.waitForTimeout(300); await rec('options-scrolled'); }
  });
  await step('more-menu', async () => {
    await go('/'); const more = mobile ? p.locator('header summary', { hasText: /^More$/ }).first() : p.locator('nav[aria-label=Primary] summary', { hasText: 'More' }).first(); if (await more.count()) { await more.click(); await p.waitForTimeout(400); await rec('more-menu'); metrics.shots[`${tag}-more-geom`] = await p.evaluate(() => { const s = [...document.querySelectorAll('header summary, nav summary')].find((e) => /More/.test(e.innerText)); const d = s?.closest('details'); const menu = d?.querySelector('ul, div[role=menu], [class*=menu], nav'); const rs = s?.getBoundingClientRect(); const rm = menu?.getBoundingClientRect(); return { summary: rs && [Math.round(rs.left), Math.round(rs.top), Math.round(rs.width), Math.round(rs.height)], menu: rm && [Math.round(rm.left), Math.round(rm.top), Math.round(rm.width), Math.round(rm.height)], items: menu && [...menu.querySelectorAll('a, button')].map((a) => a.innerText.trim()).slice(0, 12), vw: innerWidth }; }); }
  });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1200); await rec('advanced'); await rec('advanced-full', true); });
  await step('compare', async () => {
    await go('/compare'); await p.waitForTimeout(1500); await rec('compare'); await rec('compare-full', true);
    const radar = p.locator('#benchmark-radar').first(); if (await radar.count()) { await radar.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await recEl('compare-radar', radar); metrics.shots[`${tag}-radar-text`] = (await radar.innerText()).replace(/\s+/g, ' ').slice(0, 700); const hit = radar.locator('svg [role=button]').filter({ visible: true }).first(); if (await hit.count()) { if (mobile) await hit.tap(); else await hit.hover(); await p.waitForTimeout(500); await recEl('compare-radar-tip', radar); metrics.shots[`${tag}-radar-tip`] = (await radar.locator('[role=status]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400); } }
    metrics.shots[`${tag}-compare-headers`] = await p.evaluate(() => ({ h1: document.querySelector('h1')?.innerText, h2: [...document.querySelectorAll('h2')].map((e) => e.innerText.slice(0, 60)), selected: [...document.querySelectorAll('[data-compare-model], .bh-chip, [aria-label*="Remove"]')].map((e) => e.innerText.trim() || e.getAttribute('aria-label')).slice(0, 6), cols: [...document.querySelectorAll('table thead th')].map((th) => Math.round(th.getBoundingClientRect().width)).slice(0, 8) }));
  });
  await step('benchmaxxing', async () => {
    await go('/benchmaxxing'); await p.waitForTimeout(1500); await rec('benchmaxxing'); await rec('benchmaxxing-full', true);
    const ov = p.locator('section[aria-label="Benchmaxxing overview"]').first(); if (await ov.count()) { await recEl('benchmaxxing-overview', ov); metrics.shots[`${tag}-bm-overview`] = await ov.evaluate((el) => ({ rows: el.querySelectorAll('tbody tr').length, presets: [...el.querySelectorAll('[role=group] button')].map((b) => b.innerText.trim()), head: [...el.querySelectorAll('thead th')].map((t) => t.innerText.replace(/\s+/g, ' ')), first: [...el.querySelectorAll('tbody tr')].slice(0, 4).map((r) => r.innerText.replace(/\s+/g, ' ').slice(0, 140)), pills: [...el.querySelectorAll('tbody [class*=warn], tbody [data-signal-pill]')].map((e) => e.innerText.trim()).slice(0, 6) })); }
    const rep = p.locator('section[aria-label="Per-model Benchmaxxing report"]').first(); if (await rep.count()) { await rep.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await recEl('benchmaxxing-report', rep); metrics.shots[`${tag}-bm-report`] = await rep.evaluate((el) => ({ h: Math.round(el.getBoundingClientRect().height), h2: el.querySelector('h2')?.innerText, note: el.querySelector('[data-jagged-note]')?.innerText, text: el.innerText.replace(/\s+/g, ' ').slice(0, 500), spokes: el.querySelectorAll('svg line').length })); }
  });
  await step('model', async () => { await go('/models/claude-fable-5.1%3A%3Ahigh'); await rec('model'); await rec('model-full', true); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.text != null ? `${v.w}x${v.h}` : JSON.stringify(v).slice(0, 700)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 2000));
