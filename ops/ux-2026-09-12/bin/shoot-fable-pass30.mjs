// Fable pass-30 screenshot matrix: what changed since pass 29 — the JevBench page after v1.3.0 (CR-118: chance-corrected Intelligence, the
// near-chance penalty, the "What changed in the score" aside), CR-115/CR-116 rows, the new noindex multimodal preview page (CR-119), the
// MiMo-V2.6-Pro model page (CR-117.3 conflict wording), the /benchmarks matrix and rankings after the MathArena / ResearchClawBench / React Native
// Evals / Long-Horizon Terminal-Bench boards — plus the quick views. 1440/390 × light/dark. Usage: node shoot-fable-pass30.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260922-pass30/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const MIMO = 'mimo-v2.6-pro::default';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? el.innerText.replace(/\\s+/g, ' ').trim() : null;
const style = (el, props) => { if (!el) return null; const cs = getComputedStyle(el); return Object.fromEntries(props.map((k) => [k, cs[k]])); };
const lines = (el) => el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null;
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };
const glyphs = (root) => { const out = { internalArrowUp: [], externalArrowRight: [] }; for (const a of (root || document).querySelectorAll('a[href]')) { const t = txt(a); const href = a.getAttribute('href') || ''; const ext = /^https?:\\/\\//.test(href) && !href.startsWith(location.origin); if (!ext && /↗/.test(t)) out.internalArrowUp.push({ t: t.slice(0, 50), href: href.slice(0, 80) }); if (ext && /→/.test(t)) out.externalArrowRight.push({ t: t.slice(0, 50), href: href.slice(0, 80) }); } return out; };
const overflow = (root) => [...(root || document).querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), sw: e.scrollWidth, cw: e.clientWidth }));`;
const jevGeom = new Function(`${bxFn}
  const main = document.querySelector('main');
  const q = (s) => main.querySelector(s);
  const eyebrow = q('.bh-eyebrow'); const pill = eyebrow ? eyebrow.querySelector('a, button') : null;
  const aside = q('[data-bh-jev-score-change]'); const chart = q('[data-bh-jev12-main-chart]'); const formula = q('[data-bh-jevc-formula]'); const method = q('[data-bh-jev12-formula]'); const penalty = q('[data-bh-jev12-penalty]');
  const h1 = q('h1'); const own = q('[data-bh-jev-own]'); const meta = q('[data-bh-jev-meta]');
  const rows = [...main.querySelectorAll('[data-bh-jev12-bar]')].map((r) => ({ key: r.getAttribute('data-bh-jev12-bar'), score: r.getAttribute('data-bh-jevc-score'), rank: txt(r.querySelector('[data-bh-jevc-rank]')), name: txt(r.querySelector('a, span')).slice(0, 40), h: Math.round(r.getBoundingClientRect().height) }));
  const heads = [...main.querySelectorAll('h1, h2')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 70), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const intel = q('[data-bh-jev12-intel-weights]');
  return { eyebrow: eyebrow ? { t: txt(eyebrow), ...bx(eyebrow), lines: lines(eyebrow), pill: pill ? { t: txt(pill), ...bx(pill), fs: getComputedStyle(pill).fontSize } : null } : null,
    h1: bx(h1), own: { ...bx(own), lines: lines(own) }, meta: { ...bx(meta), lines: lines(meta) },
    aside: aside ? { t: txt(aside), ...bx(aside), lines: lines(aside.querySelector('p')), fs: getComputedStyle(aside.querySelector('p')).fontSize } : null,
    chart: bx(chart), chartTitle: txt(q('[data-bh-jevc-title]')), subtitle: txt(q('[data-bh-jevc-subtitle]')),
    formula: formula ? { t: txt(formula), ...bx(formula), lines: lines(formula), fs: getComputedStyle(formula).fontSize } : null,
    method: method ? { ...bx(method), first: txt(method.querySelector('p')).slice(0, 400), penalty: txt(penalty), intel: txt(intel).slice(0, 400), intelLines: lines(intel) } : null,
    rows: rows.length, top8: rows.slice(0, 8), heads, minFont: minFont(main), glyphs: glyphs(main), overflow: overflow(main) };
`);
const mmGeom = new Function(`${bxFn}
  const main = document.querySelector('main') || document.body;
  const q = (s) => main.querySelector(s);
  const banner = q('[data-bh-mm-preview-banner]'); const table = q('[data-bh-mm-overall]'); const wrap = table ? table.parentElement : null;
  const heads = [...main.querySelectorAll('h1, h2, h3')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 70), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const trs = [...(table ? table.querySelectorAll('tbody tr') : [])].map((r) => txt(r).slice(0, 160));
  const ths = [...(table ? table.querySelectorAll('thead th') : [])].map((h) => ({ t: txt(h), w: Math.round(h.getBoundingClientRect().width) }));
  const imgs = [...main.querySelectorAll('img')].map((i) => ({ alt: i.alt, w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height), nw: i.naturalWidth, nh: i.naturalHeight, ok: i.complete && i.naturalWidth > 0 }));
  const chips = [...main.querySelectorAll('span.rounded-full')].map((c) => ({ t: txt(c), fs: getComputedStyle(c).fontSize }));
  const details = [...main.querySelectorAll('details')].map((d) => ({ open: d.open, summary: txt(d.querySelector('summary')), ...bx(d) }));
  const nav = [...document.querySelectorAll('header a, nav a')].map((a) => ({ t: txt(a), href: a.getAttribute('href') })).filter((a) => /jev/i.test(a.href || ''));
  const robots = document.querySelector('meta[name=robots]')?.content;
  const title = document.title;
  const ps = [...main.querySelectorAll('p')].map((p) => ({ t: txt(p).slice(0, 90), lines: lines(p), fs: getComputedStyle(p).fontSize, words: txt(p).split(' ').length }));
  return { title, robots, banner: banner ? { t: txt(banner), ...bx(banner), ...style(banner, ['backgroundColor','color','borderColor']) } : null, table: table ? { ...bx(table), ths, trs, wrap: wrap ? { sw: wrap.scrollWidth, cw: wrap.clientWidth } : null } : null, heads, imgs, chips, details, nav, ps, minFont: minFont(main), glyphs: glyphs(main), overflow: overflow(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth } };
`);
const matrixGeom = new Function(`${bxFn}
  const main = document.querySelector('main'); const table = main.querySelector('table');
  const stubs = [...main.querySelectorAll('.bh-matrix-stub')];
  const rows = stubs.map((s) => ({ name: (txt(s.querySelector('.bh-matrix-bench')) || '').slice(0, 70), chips: s.querySelectorAll('.bh-matrix-tag').length, cap: s.querySelector('.bh-matrix-tagcap') ? txt(s.querySelector('.bh-matrix-tagcap')) : null, rowH: Math.round(s.closest('tr').getBoundingClientRect().height), stub: txt(s).slice(0, 160) }));
  const hist = {}; for (const r of rows) hist[r.chips] = (hist[r.chips] || 0) + 1;
  const wrap = table ? table.parentElement : null;
  const counts = [...main.querySelectorAll('p, div')].map((e) => txt(e)).filter((t) => t && /benchmarks across/i.test(t)).slice(0, 1);
  const groups = [...main.querySelectorAll('tbody th[colspan], tr[data-bh-matrix-group], .bh-matrix-group')].map((g) => txt(g).slice(0, 80));
  const newRows = rows.filter((r) => /AIME 2026|USAMO|HMMT|Apex|ResearchClaw|React Native|Long-Horizon|MiMo/i.test(r.name));
  const rowHs = rows.map((r) => r.rowH); const med = rowHs.slice().sort((a, b) => a - b)[Math.floor(rowHs.length / 2)];
  return { rows: rows.length, chipHist: hist, capped: rows.filter((r) => r.cap).length, newRows, medianRowH: med, maxRowH: Math.max(...rowHs), tallest: rows.slice().sort((a, b) => b.rowH - a.rowH).slice(0, 4), counts, groups: groups.slice(0, 20), wrap: wrap ? { sw: wrap.scrollWidth, cw: wrap.clientWidth } : null, minFont: minFont(main), glyphs: glyphs(main) };
`);
const rankGeom = new Function(`${bxFn}
  const main = document.querySelector('main');
  const status = [...main.querySelectorAll('[role=status]')].map((e) => txt(e).slice(0, 220));
  const trs = [...main.querySelectorAll('tbody tr')].map((r) => ({ t: txt(r).slice(0, 120), bar: r.querySelector('span.bg-accent') ? r.querySelector('span.bg-accent').style.width : null }));
  const heads = [...main.querySelectorAll('h1, h2, h3')].map((h) => h.tagName + ' ' + txt(h).slice(0, 80));
  const sub = [...main.querySelectorAll('p')].map((e) => ({ t: txt(e).slice(0, 500), lines: lines(e) })).filter((t) => t.t && t.t.length > 20).slice(0, 4);
  const labels = [...main.querySelectorAll('label')].map((e) => txt(e).slice(0, 80));
  return { status, rows: trs.length, trs: trs.slice(0, 10), heads, sub, labels, minFont: minFont(main), glyphs: glyphs(main) };
`);
const modelGeom = new Function(`${bxFn}
  const main = document.querySelector('main');
  const heads = [...main.querySelectorAll('h1, h2')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const hits = [...main.querySelectorAll('p, td, li, span, dd')].filter((e) => /81\\.7|80\\.2/.test(e.textContent) && e.children.length < 4).map((e) => ({ tag: e.tagName, t: txt(e).slice(0, 300), ...bx(e), fs: getComputedStyle(e).fontSize })).slice(0, 6);
  const cyber = [...main.querySelectorAll('tr, li, article, div')].filter((e) => /cyber/i.test(e.textContent) && e.textContent.length < 900).map((e) => ({ tag: e.tagName, t: txt(e).slice(0, 400), ...bx(e) })).slice(0, 4);
  return { heads, hits, cyber, minFont: minFont(main), glyphs: glyphs(main) };
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

  await step('jev', async () => {
    await go('/jev-models'); await rec('jev'); await rec('jev-full', true);
    metrics.shots[`${tag}-jev-geom`] = await p.evaluate(jevGeom);
    await recEl('jev-head', p.locator('main header').first());
    await recEl('jev-aside', p.locator('[data-bh-jev-score-change]'));
    await vpAt('jev-chart-vp', p.locator('[data-bh-jev12-main-chart]'), -12);
    await recEl('jev-formula', p.locator('[data-bh-jevc-formula]'));
    await recEl('jev-method', p.locator('[data-bh-jev12-formula]'));
  });
  await step('mm', async () => {
    await go('/jev-models/multimodal-preview'); await rec('mm'); await rec('mm-full', true);
    metrics.shots[`${tag}-mm-geom`] = await p.evaluate(mmGeom);
    await recEl('mm-banner', p.locator('[data-bh-mm-preview-banner]'));
    await vpAt('mm-table-vp', p.locator('[data-bh-mm-overall]'), -140);
    await vpAt('mm-skills-vp', p.locator('#skills-heading'), -12);
    await vpAt('mm-examples-vp', p.locator('#examples-heading'), -12);
    await vpAt('mm-synthetic-vp', p.locator('#synthetic-heading'), -12);
  });
  await step('matrix', async () => {
    await go('/benchmarks'); await rec('benchmarks');
    metrics.shots[`${tag}-matrix-geom`] = await p.evaluate(matrixGeom);
    const usamo = p.locator('.bh-matrix-stub').filter({ hasText: 'USAMO' });
    if (await usamo.count()) { await vpAt('matrix-matharena-vp', usamo.first().locator('xpath=ancestor::tr[1]'), -160); }
  });
  for (const [name, id] of [['rank-usamo', 'matharena-usamo::2026'], ['rank-aime', 'matharena-aime::2026'], ['rank-hmmt', 'matharena-hmmt::2026-02'], ['rank-researchclaw', 'researchclawbench::40-tasks']]) {
    await step(name, async () => { await go('/benchmarks?benchmark=' + encodeURIComponent(id)); await rec(name); metrics.shots[`${tag}-${name}-geom`] = await p.evaluate(rankGeom); });
  }
  await step('mimo', async () => {
    await go(`/models/${encodeURIComponent(MIMO)}`); await rec('mimo'); await rec('mimo-full', true);
    metrics.shots[`${tag}-mimo-geom`] = await p.evaluate(modelGeom);
    const hit = p.locator('main').getByText('81.7', { exact: false });
    if (await hit.count()) await vpAt('mimo-cyber-vp', hit.first(), -200);
  });
  await step('simple', async () => { await go('/'); await rec('simple'); metrics.shots[`${tag}-simple-minfont`] = await p.evaluate(new Function(`${bxFn} return { minFont: minFont(document.body), glyphs: glyphs(document.body) };`)); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 4000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
