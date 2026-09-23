// Fable pass-32 screenshot matrix: what changed since pass 31 — the per-system JevBench pages and the hub's link block (CR-129, shipped by
// another job), the Compare page after F-163/F-164/F-165(b) (unmeasured-model line, claim counts, cohort sub-lines), the launch-day model
// pages after the CR-128 ingests — plus the quick views (Simple, Advanced, wizard, Benchmaxxing, a model page). 1440/390 × light/dark.
// Usage: node shoot-fable-pass32.mjs <base> <out>   (ONLY=<step prefix> restricts the steps)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260923-pass32/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const MIXED = ['claude-opus-5.5::max', 'gpt-6-sol::max', 'claude-fable-5::max'];
const MIXED_Q = MIXED.map((id) => `model=${encodeURIComponent(id)}`).join('&');
const JEV = [['jev', 'jev-1.13.0'], ['semif', 'semif-qwen3.5-4b'], ['classifier', 'classifier-dev-fast'], ['needle', 'needle-3']];
const VENDOR = 'claude-opus-5.5::max', VENDOR2 = 'gpt-6-sol::max', FRONTIER = 'claude-fable-5.1::high';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : null;
const lines = (el) => el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null;
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };
const overflow = (root) => [...(root || document).querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), sw: e.scrollWidth, cw: e.clientWidth }));
const plural1 = (root) => [...(root || document).querySelectorAll('p, span, td, th, li, h1, h2, h3, summary, div')].map((e) => txt(e)).filter((t) => t && t.length < 200 && /(?<![\\d.])\\b1 (models|offers|benchmarks|results|values|providers|rows|systems|points)\\b/.test(t)).slice(0, 5);`;
const jevGeom = new Function(`${bxFn}
  const main = document.querySelector('main'); const q = (s) => main.querySelector(s);
  const h1 = q('h1'); const eyebrow = q('.bh-eyebrow'); const sub = q('.bh-page-head p');
  const score = q('[data-bh-jev-system-score]');
  const scoreBig = score ? [...score.querySelectorAll('p')].find((p) => /font-bold/.test(p.className)) : null;
  const axes = [...main.querySelectorAll('dl > div')].map((d) => ({ dt: txt(d.querySelector('dt')), dd: txt(d.querySelector('dd')), ...bx(d) }));
  const heads = [...main.querySelectorAll('h1, h2, h3')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: Math.round(h.getBoundingClientRect().y + scrollY), h: Math.round(h.getBoundingClientRect().height) }));
  const svgs = main.querySelectorAll('svg').length; const bars = main.querySelectorAll('[role=progressbar], .bh-bar, span.bg-accent').length;
  const links = [...main.querySelectorAll('a[href]')].map((a) => ({ t: txt(a).slice(0, 80), href: a.getAttribute('href').slice(0, 90) }));
  const ps = [...main.querySelectorAll('p')].map((p) => ({ t: txt(p).slice(0, 160), lines: lines(p), fs: getComputedStyle(p).fontSize }));
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent)['@graph'].map((g) => g['@type']); } catch { return 'bad'; } });
  const mainBox = bx(main); const lastEl = [...main.querySelectorAll('p, section, nav')].at(-1);
  return { title: document.title, h1: h1 ? { t: txt(h1), lines: lines(h1), fs: getComputedStyle(h1).fontSize, ff: getComputedStyle(h1).fontFamily.slice(0, 40) } : null, eyebrow: txt(eyebrow), sub: sub ? { t: txt(sub), lines: lines(sub) } : null,
    score: score ? { ...bx(score), t: txt(score).slice(0, 300), big: scoreBig ? { t: txt(scoreBig), fs: getComputedStyle(scoreBig).fontSize } : null } : null, axes, heads, svgs, bars, links, ps, ld, mainBox, contentBottom: lastEl ? bx(lastEl).y + bx(lastEl).h : null,
    minFont: minFont(main), overflow: overflow(main), plural1: plural1(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
const hubGeom = new Function(`${bxFn}
  const main = document.querySelector('main'); const sec = main.querySelector('[data-bh-jev-system-links]');
  if (!sec) return { missing: true };
  const cols = [...sec.querySelectorAll(':scope > div > div')].map((d) => ({ h3: txt(d.querySelector('h3')), n: d.querySelectorAll('a').length, ...bx(d) }));
  const links = [...sec.querySelectorAll('a')]; const sample = links.slice(0, 5).map((a) => ({ t: txt(a), href: a.getAttribute('href'), fs: getComputedStyle(a).fontSize, deco: getComputedStyle(a).textDecorationLine, h: Math.round(a.getBoundingClientRect().height) }));
  const heads = [...main.querySelectorAll('h2')].map((h) => ({ t: txt(h).slice(0, 70), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const tableLinks = [...main.querySelectorAll('table a[href^="/jev-models/"]')].length; const tableRows = main.querySelectorAll('table tbody tr').length;
  return { ...bx(sec), h2: txt(sec.querySelector('h2')), p: txt(sec.querySelector('p')), links: links.length, cols, sample, heads, tableLinks, tableRows, body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
const compareGeom = new Function(`${bxFn}
  const main = document.querySelector('main'); const q = (s) => main.querySelector(s);
  const status = q('[role=status]'); const claims = q('[data-bh-compare-claims]'); const unm = q('[data-bh-snapshot-unmeasured]');
  const snap = q('[aria-label="Benchmark category snapshots"]');
  const cards = snap ? [...snap.querySelectorAll('article')].map((a) => ({ name: txt(a.querySelector('h3')), items: [...a.querySelectorAll('li')].map((li) => txt(li).slice(0, 90)), none: a.querySelectorAll('[data-bh-snapshot-none]').length, bars: a.querySelectorAll('[role=progressbar]').length, ...bx(a) })) : [];
  const full = q('#full-comparison'); const table = full ? full.querySelector('table') : null;
  const trs = [...(table ? table.querySelectorAll('tbody tr') : [])]; const dataRows = trs.filter((r) => r.querySelector('td'));
  const subs = dataRows.map((r) => { const th = r.querySelector('th'); const s = th ? th.querySelector('span.bh-muted') : null; return { name: th ? txt(th.querySelector('span.text-accent')) : null, sub: s ? txt(s) : '' }; });
  const subHist = {}; for (const s of subs) subHist[s.sub || '(none)'] = (subHist[s.sub || '(none)'] || 0) + 1;
  const dupes = {}; for (const s of subs) { const k = s.name + '|' + s.sub; dupes[k] = (dupes[k] || 0) + 1; } const dupNames = Object.entries(dupes).filter(([, n]) => n > 1).map(([k, n]) => k + ' ×' + n);
  const sameName = {}; for (const s of subs) { sameName[s.name] = (sameName[s.name] || 0) + 1; } const repeated = Object.entries(sameName).filter(([, n]) => n > 1).map(([k, n]) => ({ name: k, n, subs: subs.filter((s) => s.name === k).map((s) => s.sub) }));
  const heads = [...main.querySelectorAll('h1, h2')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 70), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  return { status: status ? { t: txt(status), lines: lines(status) } : null, claims: claims ? { t: txt(claims), lines: lines(claims), ...bx(claims) } : null, unmeasured: unm ? { t: txt(unm), lines: lines(unm) } : null,
    snapshot: snap ? { ...bx(snap), cards: cards.length, li: snap.querySelectorAll('li').length, none: snap.querySelectorAll('[data-bh-snapshot-none]').length, sample: cards.slice(0, 4) } : null,
    full: full ? { dataRows: dataRows.length, subHist, dupNames, repeated: repeated.slice(0, 12), daggers: table.querySelectorAll('sup').length } : null,
    heads, minFont: minFont(main), overflow: overflow(main), plural1: plural1(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
const modelGeom = new Function(`${bxFn}
  const main = document.querySelector('main'); const q = (s) => main.querySelector(s);
  const h1 = q('h1'); const val = q('[data-bh-composite-value]'); const thin = q('[data-bh-composite-thin]'); const none = q('[data-bh-no-composite]');
  const inputs = [...main.querySelectorAll('span, p')].map((e) => txt(e)).find((t) => /^\\d+ of 7 inputs/.test(t || ''));
  const vendorLine = q('[data-bh-sheet-vendor-line]'); const offers = [...main.querySelectorAll('h2')].map((h) => txt(h)).find((t) => /provider/i.test(t || ''));
  const heads = [...main.querySelectorAll('h1, h2')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const firstScreen = [...main.querySelectorAll('h1, h2, h3, p')].filter((e) => e.getBoundingClientRect().top + scrollY < 844).map((e) => e.tagName + ' ' + txt(e).slice(0, 90));
  return { title: document.title, h1: txt(h1), composite: val ? { t: txt(val), fs: getComputedStyle(val).fontSize } : null, thin: thin ? { t: txt(thin), title: thin.getAttribute('title') } : null, none: none ? txt(none) : null, inputs, vendorLine: vendorLine ? { t: txt(vendorLine), lines: lines(vendorLine) } : null, offers, heads, firstScreen, svgs: main.querySelectorAll('svg').length,
    minFont: minFont(main), overflow: overflow(main), plural1: plural1(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
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
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const vpAt = async (name, loc, dy = -8) => { try { await loc.first().evaluate((el, d) => { window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d); }, dy); await p.waitForTimeout(400); await rec(name); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return; try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };

  for (const [name, key] of JEV) await step('jev-' + name, async () => { await go(`/jev-models/${key}`); await rec('jev-' + name); await rec('jev-' + name + '-full', true); metrics.shots[`${tag}-jev-${name}-geom`] = await p.evaluate(jevGeom); });
  await step('hub', async () => { await go('/jev-models'); metrics.shots[`${tag}-hub-geom`] = await p.evaluate(hubGeom); await vpAt('hub-links-vp', p.locator('[data-bh-jev-system-links]'), -12); });
  await step('cmp', async () => {
    await go('/compare?' + MIXED_Q); await p.waitForFunction(() => document.querySelector('#full-comparison tbody td'), null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(800);
    await rec('cmp'); await rec('cmp-full', true); metrics.shots[`${tag}-cmp-geom`] = await p.evaluate(compareGeom);
    await vpAt('cmp-snapshot-vp', p.locator('[aria-label="Benchmark category snapshots"]'), -12);
    await vpAt('cmp-table-vp', p.locator('#full-comparison tbody').first(), -120);
  });
  for (const [name, id] of [['opus55', VENDOR], ['sol', VENDOR2]]) await step(name, async () => { await go(`/models/${encodeURIComponent(id)}`); await rec(name); metrics.shots[`${tag}-${name}-geom`] = await p.evaluate(modelGeom); });
  await step('simple', async () => { await go('/'); await rec('simple'); metrics.shots[`${tag}-simple-minfont`] = await p.evaluate(new Function(`${bxFn} return { minFont: minFont(document.body), plural1: plural1(document.body), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth } };`)); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('wizard', async () => { await go('/'); const t = p.getByRole('tab', { name: /wizard|assistant|guided/i }); if (await t.count()) { await t.first().click(); await p.waitForTimeout(1200); await rec('wizard'); } else { const l = p.getByRole('link', { name: /wizard|assistant|guided/i }); if (await l.count()) { await l.first().click(); await p.waitForTimeout(1500); await rec('wizard'); } else metrics.shots[`${tag}-wizard-err`] = 'no wizard entry found'; } });
  await step('bmx', async () => { await go('/benchmaxxing'); await rec('bmx'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null && !v.body ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 5000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
