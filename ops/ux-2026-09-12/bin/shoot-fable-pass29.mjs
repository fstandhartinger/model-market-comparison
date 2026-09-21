// Fable pass-29 screenshot matrix: what changed since pass 28 — the /benchmarks matrix after CR-63.21 (phone chip cap "+N"), CR-63.22 / CR-83.1
// (→ for internal links, harness labels), CR-50.2 (the "Free route" pill in the overview and on the model page), the one-benchmark ranking after
// iterations 154/155 (Context Arena "8-needle", Blueprint-Bench 2's two floored rows, zero-value bars), JevBench v1.2.14 — plus the six quick views.
// 1440/390 × light/dark. Usage: node shoot-fable-pass29.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260921-pass29';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? el.innerText.replace(/\\s+/g, ' ').trim() : null;
const style = (el, props) => { if (!el) return null; const cs = getComputedStyle(el); return Object.fromEntries(props.map((k) => [k, cs[k]])); };
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };
const glyphs = (root) => { const out = { internalArrowUp: [], externalArrowRight: [] }; for (const a of (root || document).querySelectorAll('a[href]')) { const t = txt(a); const href = a.getAttribute('href') || ''; const ext = /^https?:\\/\\//.test(href) && !href.startsWith(location.origin); if (!ext && /↗/.test(t)) out.internalArrowUp.push({ t: t.slice(0, 50), href: href.slice(0, 80) }); if (ext && /→/.test(t)) out.externalArrowRight.push({ t: t.slice(0, 50), href: href.slice(0, 80) }); } return out; };`;
const matrixGeom = new Function(`${bxFn}
  const main = document.querySelector('main'); const table = main.querySelector('table');
  const stubs = [...main.querySelectorAll('.bh-matrix-stub')];
  const rows = stubs.map((s) => ({ name: (txt(s.querySelector('.bh-matrix-bench')) || '').slice(0, 70), chips: s.querySelectorAll('.bh-matrix-tag').length, visibleChips: [...s.querySelectorAll('.bh-matrix-tag')].filter((c) => c.getBoundingClientRect().width > 0).length, cap: s.querySelector('.bh-matrix-tagcap') ? { t: txt(s.querySelector('.bh-matrix-tagcap')), visible: s.querySelector('.bh-matrix-tagcap').getBoundingClientRect().width > 0, ...style(s.querySelector('.bh-matrix-tagcap'), ['fontSize','lineHeight','minHeight','borderStyle']) } : null, rowH: Math.round(s.closest('tr').getBoundingClientRect().height), stubW: Math.round(s.getBoundingClientRect().width) }));
  const capped = rows.filter((r) => r.cap); const hist = {}; for (const r of rows) hist[r.chips] = (hist[r.chips] || 0) + 1;
  const wrap = table ? table.parentElement : null;
  const counts = [...main.querySelectorAll('p, div')].map((e) => txt(e)).filter((t) => t && /benchmarks across/i.test(t)).slice(0, 1);
  const rowHs = rows.map((r) => r.rowH); const med = rowHs.slice().sort((a, b) => a - b)[Math.floor(rowHs.length / 2)];
  return { rows: rows.length, chipHist: hist, capped: capped.length, cappedSample: capped.slice(0, 4), medianRowH: med, maxRowH: Math.max(...rowHs), tallest: rows.slice().sort((a, b) => b.rowH - a.rowH).slice(0, 4), counts, wrap: wrap ? { sw: wrap.scrollWidth, cw: wrap.clientWidth } : null, minFont: minFont(main), glyphs: glyphs(main) };
`);
const rankGeom = new Function(`${bxFn}
  const main = document.querySelector('main');
  const sel = main.querySelector('select'); const selText = sel ? [...sel.options].filter((o) => o.selected).map((o) => o.textContent.trim()) : null;
  const status = [...main.querySelectorAll('[role=status]')].map((e) => txt(e).slice(0, 200));
  const trs = [...main.querySelectorAll('tbody tr')].map((r) => ({ t: txt(r).slice(0, 120), bar: r.querySelector('span.bg-accent') ? r.querySelector('span.bg-accent').style.width : null }));
  const heads = [...main.querySelectorAll('h1, h2, h3')].map((h) => h.tagName + ' ' + txt(h).slice(0, 80));
  const sub = [...main.querySelectorAll('p')].map((e) => txt(e)).filter((t) => t && t.length > 20).slice(0, 4);
  const controls = [...main.querySelectorAll('button, label, select, input')].map((e) => ({ tag: e.tagName, t: (txt(e) || e.getAttribute('aria-label') || e.name || '').slice(0, 40), ...bx(e) })).slice(0, 30);
  return { selText, status, rows: trs.length, trs: trs.slice(0, 8), heads, sub, controls, minFont: minFont(main), glyphs: glyphs(main) };
`);
const modelGeom = new Function(`${bxFn}
  const main = document.querySelector('main');
  const heads = [...main.querySelectorAll('h1, h2')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const free = [...main.querySelectorAll('[data-bh-free-route-current], .bh-free-tag')].map((e) => ({ t: txt(e), title: (e.getAttribute('title') || '').slice(0, 160), ...bx(e) }));
  const raw = [...main.querySelectorAll('a[target=_blank]')].map((a) => ({ t: txt(a).slice(0, 50), href: (a.getAttribute('href') || '').slice(0, 80), rel: a.getAttribute('rel') })).slice(0, 12);
  return { heads, free, rawLinks: raw, minFont: minFont(main), glyphs: glyphs(main) };
`);
const advGeom = new Function(`${bxFn}
  const main = document.querySelector('main');
  const free = [...main.querySelectorAll('[data-bh-free-route]')].map((e) => ({ t: txt(e), title: (e.getAttribute('title') || '').slice(0, 160), ...bx(e), ...style(e, ['fontSize','color','boxShadow']) }));
  const legend = [...main.querySelectorAll('[data-bh-tag-legend]')].map((e) => e.getAttribute('data-bh-tag-legend'));
  const badges = [...main.querySelectorAll('.bh-outlier-tag')].map((e) => ({ t: txt(e), fs: getComputedStyle(e).fontSize })).slice(0, 6);
  return { free: free.slice(0, 6), freeCount: free.length, legend, badges, minFont: minFont(main), glyphs: glyphs(main) };
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
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const recEl = async (name, loc) => { try { await loc.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await loc.first().screenshot({ path: `${OUT}/${tag}-${name}.png` }); metrics.shots[`${tag}-${name}`] = await loc.first().boundingBox(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const vpAt = async (name, loc, dy = -8) => { try { await loc.first().evaluate((el, d) => { window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d); }, dy); await p.waitForTimeout(400); await rec(name); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return; try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };

  await step('matrix', async () => {
    await go('/benchmarks'); await rec('benchmarks');
    metrics.shots[`${tag}-matrix-geom`] = await p.evaluate(matrixGeom);
    const capped = p.locator('.bh-matrix-stub').filter({ has: p.locator('.bh-matrix-tagcap') });
    if (await capped.count()) {
      const row = capped.first().locator('xpath=ancestor::tr[1]');
      await vpAt('matrix-capped-vp', row, -120);
      await recEl('matrix-capped-row', row);
      if (mobile) {
        await capped.first().locator('.bh-matrix-tagcap').tap();
        await p.waitForTimeout(400);
        await recEl('matrix-capped-row-open', row);
        metrics.shots[`${tag}-matrix-open-geom`] = await row.evaluate((r) => ({ h: Math.round(r.getBoundingClientRect().height), chips: [...r.querySelectorAll('.bh-matrix-tag')].filter((c) => c.getBoundingClientRect().width > 0).length, cap: r.querySelector('.bh-matrix-tagcap')?.textContent }));
      }
    }
  });
  await step('rank-blueprint', async () => {
    await go('/benchmarks?benchmark=' + encodeURIComponent('blueprint-bench::2')); await rec('rank-blueprint'); await rec('rank-blueprint-full', true);
    metrics.shots[`${tag}-rank-blueprint-geom`] = await p.evaluate(rankGeom);
  });
  await step('rank-context', async () => {
    await go('/benchmarks?benchmark=' + encodeURIComponent('context-arena-mrcr-v2::8-needle')); await rec('rank-context');
    metrics.shots[`${tag}-rank-context-geom`] = await p.evaluate(rankGeom);
  });
  await step('advanced', async () => {
    await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced');
    metrics.shots[`${tag}-advanced-geom`] = await p.evaluate(advGeom);
    const free = p.locator('[data-bh-free-route]');
    if (await free.count()) { await vpAt('advanced-free-vp', free.first(), -200); await recEl('advanced-free-row', free.first().locator('xpath=ancestor::tr[1]')); }
  });
  await step('simple', async () => { await go('/'); await rec('simple'); metrics.shots[`${tag}-simple-minfont`] = await p.evaluate(new Function(`${bxFn} return { minFont: minFont(document.body), glyphs: glyphs(document.body) };`)); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); });
  await step('model', async () => {
    await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model');
    metrics.shots[`${tag}-model-geom`] = await p.evaluate(modelGeom);
    await go(`/models/${encodeURIComponent(FRONTIER)}#all-offers`); await p.waitForTimeout(800); await rec('model-all-offers');
    metrics.shots[`${tag}-model-all-offers-open`] = await p.evaluate(() => { const d = document.getElementById('all-offers'); return d ? { open: d.open, y: Math.round(d.getBoundingClientRect().y), scrollY: Math.round(scrollY) } : null; });
  });
  await step('jev', async () => { await go('/jev-models'); await rec('jev'); metrics.shots[`${tag}-jev-geom`] = await p.evaluate(new Function(`${bxFn} const rows=[...document.querySelectorAll('[data-bh-jev12-row]')].map((r)=>({key:r.getAttribute('data-bh-jev12-row'),rank:txt(r.querySelector('[data-bh-jev12-rank]')),score:txt(r.querySelectorAll('td')[0])})); return { eyebrows: [...document.querySelectorAll('.bh-eyebrow')].map(txt).slice(0,3), rows: rows.length, top6: rows.slice(0,6), minFont: minFont(document.querySelector('main')) };`)); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 3000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
