// Fable pass-26 screenshot matrix: what changed since pass 25 — /jev-models after F-139/F-140 (scope state, dense task grid, sticky head),
// CR-96 (cost unit "per 1,000 decisions", correction disclosure), CR-97 (classifier.dev honorable mention), and the CR-98 Step 5 Preview
// model page (vendor-reported † values). 1440/390 × light/dark. Usage: node shoot-fable-pass26.mjs <base> <out> [changed-only]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260920-pass26';
const CHANGED_ONLY = process.argv[4] === 'changed-only';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const STEP5 = 'step-5-preview::default';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const lines = (el) => { if (!el) return null; const lh = parseFloat(getComputedStyle(el).lineHeight) || 16; return Math.round(el.getBoundingClientRect().height / lh); };
const txt = (el) => el ? el.innerText.replace(/\\s+/g, ' ').trim() : null;
const sentences = (el) => el ? (el.innerText.match(/[.!?](\\s|$)/g) || []).length : null;`;
const jevGeom = new Function(`${bxFn}
  const q = (s) => document.querySelector(s);
  const cu = [...document.querySelectorAll('[data-bh-jev12-cost-unit]')].map((e) => ({ t: txt(e).slice(0, 300), lines: lines(e), ...bx(e), fs: getComputedStyle(e).fontSize }));
  const th = [...document.querySelectorAll('[data-bh-jev12-table] thead th')].map((e) => ({ t: txt(e).slice(0, 60), lines: lines(e), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }));
  const hon = q('[data-bh-jev12-honorable]');
  const honRows = [...document.querySelectorAll('[data-bh-jev12-honorable-row]')].map((r) => ({ k: r.getAttribute('data-bh-jev12-honorable-row'), ...bx(r), h3: txt(r.querySelector('h3')), score: txt(r.querySelector('[data-bh-jev12-honorable-score]')), runsOn: txt(r.querySelector('[data-bh-jev12-honorable-runs-on]')), axes: txt(r.querySelector('[data-bh-jev12-honorable-axes]')), why: { t: txt(r.querySelector('[data-bh-jev12-honorable-why]')), lines: lines(r.querySelector('[data-bh-jev12-honorable-why]')), s: sentences(r.querySelector('[data-bh-jev12-honorable-why]')) }, price: { t: txt(r.querySelector('[data-bh-jev12-honorable-price]')), lines: lines(r.querySelector('[data-bh-jev12-honorable-price]')), s: sentences(r.querySelector('[data-bh-jev12-honorable-price]')) }, finding: { t: txt(r.querySelector('[data-bh-jev12-honorable-finding]')), lines: lines(r.querySelector('[data-bh-jev12-honorable-finding]')), s: sentences(r.querySelector('[data-bh-jev12-honorable-finding]')) }, bolds: [...r.querySelectorAll('b')].map((b) => ({ t: txt(b).slice(0, 30), color: getComputedStyle(b).color })), textLen: txt(r).length, paragraphs: r.querySelectorAll('p').length }));
  const honHead = q('[data-bh-jev12-honorable-head]');
  const gray200 = [...document.querySelectorAll('main .text-gray-200')].map((e) => ({ t: txt(e).slice(0, 30), color: getComputedStyle(e).color, bg: getComputedStyle(e.closest('.bh-panel, section, main')).backgroundColor }));
  const bodyColor = getComputedStyle(document.body).color; const bodyBg = getComputedStyle(document.body).backgroundColor;
  const heads = [...document.querySelectorAll('main h2, main h3')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 70), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const oneliner = txt(q('[data-bh-jev12-oneliner]'));
  const legendLine = q('[data-bh-jev12-legend-line]');
  const scope = q('[data-bh-jev12-scope]');
  const chartBadge = txt(q('[data-bh-jev12-main-chart] .bh-thin-tag, [data-bh-jev12-main] .bh-thin-tag'));
  const grid = q('[data-bh-jev12-task-table]'); const wrap = grid?.parentElement;
  const g = grid ? { table: bx(grid), wrap: bx(wrap), wrapOverflow: getComputedStyle(wrap).overflowX, wrapMaxH: getComputedStyle(wrap).maxHeight, rows: grid.querySelectorAll('tbody tr').length, cols: grid.querySelectorAll('thead th').length, firstTh: bx(grid.querySelector('thead th')), firstTd: bx(grid.querySelector('tbody td')), firstTdPos: getComputedStyle(grid.querySelector('tbody td')).position, thPos: getComputedStyle(grid.querySelector('thead th')).position, rowH: Math.round(grid.querySelector('tbody tr')?.getBoundingClientRect().height), cellW: Math.round(grid.querySelector('tbody td:nth-child(3)')?.getBoundingClientRect().width || 0), firstTdText: txt(grid.querySelector('tbody td')).slice(0, 120), headTexts: [...grid.querySelectorAll('thead th')].slice(0, 5).map((e) => txt(e).slice(0, 40)), groupRow: txt(grid.querySelector('[data-bh-jev12-task-group]'))?.slice(0, 200) } : null;
  const details = [...document.querySelectorAll('main details')].map((d) => ({ s: txt(d.querySelector('summary')).slice(0, 80), open: d.open, y: Math.round(d.getBoundingClientRect().y + scrollY) }));
  const corr = [...document.querySelectorAll('main details')].find((d) => /correct/i.test(txt(d.querySelector('summary'))));
  return { cu, th, hon: hon ? { ...bx(hon), h2: txt(hon.querySelector('h2')), rule: { t: txt(hon.querySelector('[data-bh-jev12-honorable-rule]')), lines: lines(hon.querySelector('[data-bh-jev12-honorable-rule]')) }, rows: honRows, textLen: txt(hon).length } : null, honHead: honHead ? { t: txt(honHead).slice(0, 200), ...bx(honHead) } : null, gray200, bodyColor, bodyBg, heads, oneliner, legendLine: legendLine ? { t: txt(legendLine).slice(0, 300), lines: lines(legendLine) } : null, scope: scope ? { t: txt(scope).slice(0, 200), ...bx(scope) } : null, chartBadge, grid: g, details, corr: corr ? { s: txt(corr.querySelector('summary')), len: txt(corr).length, lines: lines(corr), ...bx(corr) } : null };
`);
const modelGeom = new Function(`${bxFn}
  const daggers = [...document.querySelectorAll('main sup, main [title*="self-reported" i], main [title*="vendor" i]')].map((e) => ({ tag: e.tagName, t: txt(e).slice(0, 40), title: (e.getAttribute('title') || '').slice(0, 120), ...bx(e) })).slice(0, 12);
  const selfRep = [...document.querySelectorAll('main *')].filter((e) => e.children.length === 0 && /self-reported|vendor-reported/i.test(e.textContent)).map((e) => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), t: txt(e).slice(0, 120), ...bx(e), fs: getComputedStyle(e).fontSize, color: getComputedStyle(e).color })).slice(0, 20);
  const heads = [...document.querySelectorAll('main h1, main h2, main h3')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 70), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const hero = txt(document.querySelector('main h1')?.parentElement)?.slice(0, 400);
  const tags = [...document.querySelectorAll('main .bh-thin-tag, main [class*="tag"]')].map((e) => txt(e).slice(0, 40)).slice(0, 30);
  const tables = [...document.querySelectorAll('main table')].map((t) => ({ rows: t.querySelectorAll('tbody tr').length, cols: t.querySelectorAll('thead th').length, ...bx(t), head: [...t.querySelectorAll('thead th')].map((e) => txt(e).slice(0, 30)) }));
  const legend = [...document.querySelectorAll('main details summary')].map((s) => txt(s).slice(0, 60));
  const banners = [...document.querySelectorAll('main [role="note"], main [role="status"], main .bh-callout, main [data-bh-callout]')].map((e) => ({ t: txt(e).slice(0, 200), ...bx(e) }));
  return { daggers, selfRep, heads, hero, tags, tables, legend, banners, offers: txt(document.querySelector('main'))?.match(/\\d+ offers/)?.[0] };
`);
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
  const vpAt = async (name, loc, dy = -8) => { try { await loc.first().evaluate((el, d) => { window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d); }, dy); await p.waitForTimeout(400); await rec(name); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };

  await step('jev', async () => {
    await go('/jev-models'); await rec('jev'); await rec('jev-full', true);
    metrics.shots[`${tag}-jev-geom`] = await p.evaluate(jevGeom);
    await recEl('jev-chart', p.locator('[data-bh-jev12-main-chart]'));
    await recEl('jev-table', p.locator('[data-bh-jev12-table]'));
    await vpAt('jev-table-vp', p.locator('[data-bh-jev12-table]'), -60);
    await vpAt('jev-honorable-vp', p.locator('[data-bh-jev12-honorable]'));
    await recEl('jev-honorable', p.locator('[data-bh-jev12-honorable]'));
    if (mobile) { await p.evaluate(() => scrollBy(0, 700)); await p.waitForTimeout(300); await rec('jev-honorable-vp2'); }
    // cost section: open the correction disclosure
    const corr = p.locator('main details').filter({ has: p.locator('summary', { hasText: /correct/i }) });
    if (await corr.count()) {
      await vpAt('jev-cost-vp', corr, -200);
      await corr.first().evaluate((d) => { d.open = true; }); await p.waitForTimeout(400);
      await recEl('jev-correction-open', corr);
      metrics.shots[`${tag}-jev-correction`] = await corr.first().evaluate((d) => { const lh = parseFloat(getComputedStyle(d).lineHeight) || 16; return { len: d.innerText.length, lines: Math.round(d.getBoundingClientRect().height / lh), h: Math.round(d.getBoundingClientRect().height), text: d.innerText.replace(/\s+/g, ' ').slice(0, 1500), tables: d.querySelectorAll('table').length, lis: d.querySelectorAll('li').length }; });
    }
    // task grid open
    const grid = p.locator('[data-bh-jev12-task-grid]');
    if (await grid.count()) {
      await grid.first().evaluate((d) => { if (d.tagName === 'DETAILS') d.open = true; else d.querySelector('details') && (d.querySelector('details').open = true); }); await p.waitForTimeout(500);
      metrics.shots[`${tag}-jev-grid-geom`] = (await p.evaluate(jevGeom)).grid;
      await vpAt('jev-grid-open-vp', p.locator('[data-bh-jev12-task-table]'), -120);
      // scroll the grid wrap horizontally and down
      await p.locator('[data-bh-jev12-task-table]').first().evaluate((t) => { const w = t.parentElement; w.scrollLeft = 260; w.scrollTop = 900; }); await p.waitForTimeout(400);
      await rec('jev-grid-scrolled-vp');
      metrics.shots[`${tag}-jev-grid-scrolled`] = await p.evaluate(() => { const t = document.querySelector('[data-bh-jev12-task-table]'); const w = t.parentElement; const wr = w.getBoundingClientRect(); const th = t.querySelector('thead th'); const tdr = [...t.querySelectorAll('tbody td:first-child')].map((td) => td.getBoundingClientRect()).find((r) => r.bottom > wr.top + 40 && r.top < wr.bottom); const thr = th.getBoundingClientRect(); return { scrollLeft: w.scrollLeft, scrollTop: w.scrollTop, wrap: { x: Math.round(wr.x), w: Math.round(wr.width), h: Math.round(wr.height) }, headTop: Math.round(thr.top - wr.top), firstTdLeft: tdr ? Math.round(tdr.left - wr.x) : null, firstTdW: tdr ? Math.round(tdr.width) : null, visibleTaskCellClipped: tdr ? tdr.left < wr.x : null }; });
    }
    await p.evaluate(() => document.querySelectorAll('main details').forEach((d) => { d.open = true; })); await p.waitForTimeout(400);
    metrics.shots[`${tag}-jev-method-text`] = await p.evaluate(() => { const m = document.querySelector('#method, #jev12-method, [data-bh-jev12-notes]'); return m ? m.innerText.replace(/\s+/g, ' ').slice(0, 1500) : null; });
  });
  await step('jev-easy', async () => {
    await go('/jev-models?scope=easy');
    metrics.shots[`${tag}-jev-easy`] = await p.evaluate(() => ({ badge: [...document.querySelectorAll('[data-bh-jev12-main] .bh-thin-tag, [data-bh-jev12-main-chart] .bh-thin-tag')].map((e) => e.innerText).slice(0, 4), warn: document.querySelector('[data-bh-jev12-scope-warning]')?.innerText.replace(/\s+/g, ' ').slice(0, 200), reset: !!document.querySelector('[data-bh-jev12-scope-reset]'), h2: document.querySelector('[data-bh-jev12-main] h2, main h2')?.innerText, eyebrow: document.querySelector('[data-bh-jev12-main] .bh-eyebrow, [data-bh-jev12-main] p')?.innerText.replace(/\s+/g, ' ').slice(0, 200) }));
    await recEl('jev-chart-easy', p.locator('[data-bh-jev12-main-chart]'));
  });
  await step('step5', async () => {
    await go(`/models/${encodeURIComponent(STEP5)}`); await rec('step5'); await rec('step5-full', true);
    metrics.shots[`${tag}-step5-geom`] = await p.evaluate(modelGeom);
    const ev = p.locator('main table').first();
    await vpAt('step5-bench-vp', ev, -120);
    await p.evaluate(() => document.querySelectorAll('main details').forEach((d) => { d.open = true; })); await p.waitForTimeout(400);
    await rec('step5-full-open', true);
  });
  await step('step5-overview', async () => {
    await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500);
    metrics.shots[`${tag}-step5-overview-row`] = await p.evaluate(() => { const rows = [...document.querySelectorAll('main table tbody tr')]; const r = rows.find((x) => /Step 5/i.test(x.innerText)); if (!r) return { found: false, rows: rows.length }; const rect = r.getBoundingClientRect(); return { found: true, idx: rows.indexOf(r), t: r.innerText.replace(/\s+/g, ' ').slice(0, 300), y: Math.round(rect.y + scrollY), h: Math.round(rect.height) }; });
    await go('/benchmarks');
    metrics.shots[`${tag}-step5-benchmarks`] = await p.evaluate(() => { const t = document.querySelector('main').innerText; const i = t.indexOf('Step 5'); return { present: i >= 0, ctx: i >= 0 ? t.slice(Math.max(0, i - 150), i + 200).replace(/\s+/g, ' ') : null, dagger: /†/.test(t) }; });
  });
  if (CHANGED_ONLY) { await c.close(); continue; }
  await step('simple', async () => { await go('/'); await rec('simple'); await rec('simple-full', true); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); });
  await step('benchmarks', async () => { await go('/benchmarks'); await rec('benchmarks'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 2500)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
