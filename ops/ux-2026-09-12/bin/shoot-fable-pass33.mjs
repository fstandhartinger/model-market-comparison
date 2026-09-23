// Fable pass-33 screenshot matrix: what changed since pass 32 — the JevBench hub after CR-132/CR-134/CR-135 (v1.4.1 board, four compare
// radars, restored bar chart and sections, † notes), the pinned /jev-models/v1.4 and /v1.4.1 share pages, the per-system pages after
// F-167/F-169 (Jev and the v1.4.1 top-five newcomers) — plus the quick views (Simple, Advanced, wizard, Benchmaxxing, a model page).
// 1440/390 × light/dark.  Usage: node shoot-fable-pass33.mjs <base> <out>   (ONLY=<step prefix> restricts the steps)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260923-pass33/canonical';
await fs.mkdir(OUT, { recursive: true });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const SYS = [['jev', 'jev-1.13.0'], ['jevk5', 'jevk5-v02'], ['hopper', 'hopper'], ['reflex', 'reflex-4b']];
const FRONTIER = 'claude-fable-5.1::high';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : null;
const lines = (el) => el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null;
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };
const overflow = (root) => [...(root || document).querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), sw: e.scrollWidth, cw: e.clientWidth }));
const plural1 = (root) => [...(root || document).querySelectorAll('p, span, td, th, li, h1, h2, h3, summary, div')].map((e) => txt(e)).filter((t) => t && t.length < 200 && /(?<![\\d.])\\b1 (models|offers|benchmarks|results|values|providers|rows|systems|points)\\b/.test(t)).slice(0, 5);
const vis = (el) => el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });`;
const hubGeom = new Function(`${bxFn}
  const main = document.querySelector('main'); const q = (s) => main.querySelector(s);
  const heads = [...main.querySelectorAll('h1, h2, h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 90), y: Math.round(h.getBoundingClientRect().y + scrollY), fs: getComputedStyle(h).fontSize }));
  const h2s = heads.filter((h) => h.t.startsWith('H2')).map((h) => h.t.slice(3)); const dupH2 = Object.entries(h2s.reduce((a, t) => (a[t] = (a[t] || 0) + 1, a), {})).filter(([, n]) => n > 1);
  const tables = [...main.querySelectorAll('table')].map((t) => ({ rows: t.querySelectorAll('tbody tr').length, cols: t.querySelectorAll('thead th').length, ...bx(t), sup: t.querySelectorAll('sup').length, links: t.querySelectorAll('a[href^="/jev-models/"]').length, wrapOverflow: t.parentElement.scrollWidth > t.parentElement.clientWidth + 2 }));
  const svgs = [...main.querySelectorAll('svg')].filter(vis).map((s) => ({ ...bx(s), lbl: (s.getAttribute('aria-label') || s.getAttribute('role') || '').slice(0, 40) })).filter((s) => s.w > 40);
  const radars = main.querySelectorAll('[data-bh-jev12-radar]').length; const cap = q('[data-bh-jevc-chart]'); const bars = q('[data-bh-jevc-bars]');
  const details = [...main.querySelectorAll('details')].map((d) => ({ s: txt(d.querySelector('summary')).slice(0, 70), open: d.open, y: Math.round(d.getBoundingClientRect().y + scrollY) }));
  const selects = main.querySelectorAll('select').length; const buttons = main.querySelectorAll('button').length; const inputs = main.querySelectorAll('input').length;
  const share = q('[data-bh-jev-version-share]'); const change = q('[data-bh-jev-score-change]');
  const firstScreen = [...main.querySelectorAll('h1, h2, h3, p, summary')].filter((e) => vis(e) && e.getBoundingClientRect().top + scrollY < 900).map((e) => e.tagName + ' ' + txt(e).slice(0, 100));
  const words = txt(main).split(' ').length;
  return { title: document.title, heads, dupH2, tables, svgs: svgs.length, svgSample: svgs.slice(0, 14), radars, cap: cap ? { ...bx(cap), svg: cap.querySelectorAll('svg').length } : null, bars: bars ? bx(bars) : null, details, selects, buttons, inputs, share: share ? { t: txt(share).slice(0, 160), ...bx(share) } : null, change: change ? { t: txt(change).slice(0, 200), ...bx(change) } : null, firstScreen, words, minFont: minFont(main), overflow: overflow(main), plural1: plural1(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
const sysGeom = new Function(`${bxFn}
  const main = document.querySelector('main'); const q = (s) => main.querySelector(s);
  const h1 = q('h1'); const sub = q('.bh-page-head p'); const score = q('[data-bh-jev-system-score]');
  const heads = [...main.querySelectorAll('h1, h2, h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const strip = q('[data-bh-jev-system-strip]'); const bands = main.querySelectorAll('[data-bh-jev-system-band]').length; const radar = q('[data-bh-jev-system-radar]');
  const ps = [...main.querySelectorAll('p')].filter(vis).map((p) => ({ t: txt(p).slice(0, 140), lines: lines(p) }));
  const links = [...main.querySelectorAll('a[href]')].map((a) => ({ t: txt(a).slice(0, 60), href: a.getAttribute('href').slice(0, 80) }));
  const lastEl = [...main.querySelectorAll('p, section, nav, table')].at(-1);
  return { title: document.title, h1: txt(h1), sub: sub ? { t: txt(sub), lines: lines(sub) } : null, score: score ? { t: txt(score).slice(0, 200), ...bx(score) } : null, heads, strip: strip ? bx(strip) : null, bands, radar: radar ? bx(radar) : null, svgs: main.querySelectorAll('svg').length, ps, links, contentBottom: lastEl ? bx(lastEl).y + bx(lastEl).h : null, minFont: minFont(main), overflow: overflow(main), plural1: plural1(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  if (process.env.CTX && process.env.CTX !== `${kind}_${theme}`) continue;
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); p.setDefaultTimeout(15000);
  const tag = `${kind}_${theme}`;
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const vpAt = async (name, loc, dy = -8) => { try { await loc.first().evaluate((el, d) => { window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d); }, dy); await p.waitForTimeout(400); await rec(name); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return; try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };

  await step('hub', async () => {
    await go('/jev-models'); await rec('hub'); metrics.shots[`${tag}-hub-geom`] = await p.evaluate(hubGeom);
    if (!mobile) await rec('hub-full', true);
    await vpAt('hub-compare-vp', p.getByRole('heading', { name: /^Compare two systems/ }).first(), -12);
    await vpAt('hub-radars-vp', p.getByRole('heading', { name: /Accuracy per tier/ }).first(), -12);
    await vpAt('hub-changed-vp', p.getByRole('heading', { name: /What changed in v1\.4/ }).first(), -12);
    await vpAt('hub-cap-vp', p.locator('[data-bh-jevc-chart]'), -60);
    await vpAt('hub-table-vp', p.locator('main table').first(), -80);
    await vpAt('hub-history-vp', p.locator('[data-bh-jev13-history]'), -300);
  });
  for (const [name, key] of SYS) await step('sys-' + name, async () => { await go(`/jev-models/${key}`); await rec('sys-' + name); metrics.shots[`${tag}-sys-${name}-geom`] = await p.evaluate(sysGeom); if (!mobile) await rec('sys-' + name + '-full', true); });
  for (const v of ['v1.4.1', 'v1.4']) await step('pin-' + v, async () => { await go(`/jev-models/${v}`); await rec('pin-' + v); metrics.shots[`${tag}-pin-${v}-geom`] = await p.evaluate(hubGeom); });
  await step('simple', async () => { await go('/'); await rec('simple'); metrics.shots[`${tag}-simple-minfont`] = await p.evaluate(new Function(`${bxFn} return { minFont: minFont(document.body), plural1: plural1(document.body), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth } };`)); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('wizard', async () => { await go('/'); const t = p.getByRole('tab', { name: /wizard|assistant|guided/i }); if (await t.count()) { await t.first().click(); await p.waitForTimeout(1200); await rec('wizard'); } else { const l = p.getByRole('link', { name: /wizard|assistant|guided/i }); if (await l.count()) { await l.first().click(); await p.waitForTimeout(1500); await rec('wizard'); } else metrics.shots[`${tag}-wizard-err`] = 'no wizard entry found'; } });
  await step('bmx', async () => { await go('/benchmaxxing'); await rec('bmx'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); });
  await c.close(); await b.close();
  await fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}${process.env.CTX ? '-' + process.env.CTX : ''}.json`, JSON.stringify(metrics, null, 1));
}
await fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null && !v.body ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 6000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
