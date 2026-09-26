// Fable pass-36 screenshot matrix: what changed since pass 35 — the JevBench hub after CR-158 (Capability-first: Jev-class Capability ranking,
// bubble charts, composite with weight sliders), CR-163/CR-164 (mobile headline, row rhythm), CR-169/CR-169.1 (presentation polish, ⓘ trigger),
// CR-167/CR-167.2 (fast-lane banner, compact on phones); the pinned /jev-models/v1.4.2; the published /image-jev-bench (CR-166); plus the quick
// views (Simple, Advanced, wizard, Benchmaxxing, a model page, Benchmarks) on today's data. 1440/390 × light/dark.
// Usage: node shoot-fable-pass36.mjs <base> <out>   (ONLY=<step prefix>, CTX=<kind_theme>)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260926-pass36/canonical';
await fs.mkdir(OUT, { recursive: true });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : null;
const lines = (el) => el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null;
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };
const overflow = (root) => [...(root || document).querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), sw: e.scrollWidth, cw: e.clientWidth }));
const plural1 = (root) => [...(root || document).querySelectorAll('p, span, td, th, li, h1, h2, h3, summary, div')].map((e) => txt(e)).filter((t) => t && t.length < 200 && /(?<![\\d.])\\b1 (models|offers|benchmarks|results|values|providers|rows|systems|points|items|decisions)\\b/.test(t)).slice(0, 5);
const vis = (el) => el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });
const underscoreWords = (root) => [...(root || document).querySelectorAll('p, li, td, th, h1, h2, h3, summary, dt, dd, span')].filter((e) => !e.closest('code')).map((e) => txt(e)).filter((t) => t && t.length < 300 && /\\b[a-z]+_[a-z_]+\\b/.test(t)).map((t) => (t.match(/\\b[a-z]+_[a-z_]+\\b/) || [''])[0]).slice(0, 6);`;
const pageGeom = new Function(`${bxFn}
  const main = document.querySelector('main') || document.body; const q = (s) => main.querySelector(s);
  const heads = [...main.querySelectorAll('h1, h2, h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 90), y: Math.round(h.getBoundingClientRect().y + scrollY), fs: getComputedStyle(h).fontSize }));
  const tables = [...main.querySelectorAll('table')].filter(vis).map((t) => ({ rows: t.querySelectorAll('tbody tr').length, cols: t.querySelectorAll('thead th').length, ...bx(t), wrapOverflow: t.parentElement.scrollWidth > t.parentElement.clientWidth + 2 }));
  const svgs = [...main.querySelectorAll('svg')].filter(vis).map((s) => ({ ...bx(s), lbl: (s.getAttribute('aria-label') || s.getAttribute('role') || '').slice(0, 40) })).filter((s) => s.w > 40);
  const details = [...main.querySelectorAll('details')].map((d) => ({ s: txt(d.querySelector('summary')).slice(0, 70), open: d.open, y: Math.round(d.getBoundingClientRect().y + scrollY) }));
  const firstScreen = [...main.querySelectorAll('h1, h2, h3, p, summary, li, button')].filter((e) => vis(e) && e.getBoundingClientRect().top + scrollY < 900).map((e) => e.tagName + ' ' + txt(e).slice(0, 110));
  const sliders = [...main.querySelectorAll('input[type=range]')].map((s) => ({ ...bx(s), lbl: (s.getAttribute('aria-label') || s.id || '').slice(0, 40), v: s.value }));
  const words = txt(main).split(' ').length;
  return { title: document.title, url: location.pathname + location.search, heads, tables, svgs: svgs.length, svgSample: svgs.slice(0, 14), details, firstScreen, sliders, words, links: main.querySelectorAll('a[href]').length, buttons: main.querySelectorAll('button').length, minFont: minFont(main), overflow: overflow(main), plural1: plural1(main), underscore: underscoreWords(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
const hubExtra = new Function(`${bxFn}
  const q = (s) => document.querySelector(s); const all = (s) => [...document.querySelectorAll(s)];
  const cls = {}; for (const k of ['summary', 'rule', 'outside', 'more', 'method', 'list', 'divider']) { const e = q('[data-bh-jev-class-' + k + ']'); cls[k] = e ? { ...bx(e), t: txt(e).slice(0, 300), vis: !!vis(e) } : null; }
  const capRows = all('[data-bh-jev14-capability-row]').map((r) => ({ ...bx(r), t: txt(r).slice(0, 90), vis: !!vis(r) }));
  const rowH = capRows.reduce((a, r) => (a[r.h] = (a[r.h] || 0) + 1, a), {});
  const firstCap = capRows.find((r) => r.vis) || null;
  const scatter = all('[data-bh-jev14-scatter]').map((s) => ({ ...bx(s), points: s.querySelectorAll('[data-bh-jev14-point]').length, top5: s.querySelectorAll('[data-bh-jev14-scatter-top-five]').length, svgTexts: [...s.querySelectorAll('svg text')].filter(vis).map((t) => ({ ...bx(t), t: txt(t).slice(0, 30), fs: getComputedStyle(t).fontSize })) }));
  const labelOverlaps = scatter.map((s) => { const L = s.svgTexts.filter((t) => t.t && !/^[\\d.$%]+$/.test(t.t)); let n = 0; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) n++; } return { labels: L.length, overlaps: n }; });
  const sliders = all('input[type=range]').map((s) => ({ ...bx(s), lbl: (s.getAttribute('aria-label') || s.id || '').slice(0, 50), v: s.value, min: s.min, max: s.max }));
  const view = q('[data-bh-jev14-view]'); const sort = all('[data-bh-jev14-chart-sort]').map((e) => ({ ...bx(e), t: txt(e).slice(0, 80) }));
  const firstBar = q('[data-bh-jev14-bar]'); const bars = all('[data-bh-jev14-bar]').length;
  const eyebrows = all('[data-bh-jev14-chart-eyebrow]').map((e) => ({ ...bx(e), t: txt(e).slice(0, 60), vis: !!vis(e) }));
  const compact = all('[data-bh-jev14-compact]').map((e) => ({ tag: e.tagName, ...bx(e) }));
  const banner = q('[data-bh-fastlane-expanded]'); const bannerEl = banner || q('[class*="fastlane"], [data-bh-fastlane]');
  const bannerInfo = bannerEl ? { ...bx(bannerEl), fixed: getComputedStyle(bannerEl).position, expanded: bannerEl.getAttribute('data-bh-fastlane-expanded'), t: txt(bannerEl).slice(0, 200), bg: getComputedStyle(bannerEl).backgroundColor, bottomPad: getComputedStyle(document.body).paddingBottom, vpBottom: innerHeight } : null;
  const infoTriggers = all('[data-bh-jev14-capability-row] button, [data-bh-jev14-capability-row] summary').filter(vis).map((b) => ({ ...bx(b), t: txt(b).slice(0, 20), al: (b.getAttribute('aria-label') || '').slice(0, 40) }));
  const status3d = q('[data-bh-jev14-capability-3d-status]');
  const contextH = [...document.querySelectorAll('h2, h3')].filter((h) => /context/i.test(txt(h))).map((h) => ({ t: txt(h).slice(0, 90), y: bx(h).y }));
  const head = q('main .bh-page-head') || q('main header'); const headText = head ? txt(head) : '';
  const svgTextColors = [...document.querySelectorAll('svg text')].filter(vis).slice(0, 400).map((t) => getComputedStyle(t).fill).reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});
  const priority = all('[data-bh-jev14-priority-run]').map((e) => txt(e).slice(0, 80));
  const topFive = q('[data-bh-jev14-top-five-note]');
  return { cls, capRows: capRows.length, capVisible: capRows.filter((r) => r.vis).length, rowH, firstCapY: firstCap ? firstCap.y : null, firstCap: firstCap ? firstCap.t : null, scatter: scatter.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h, points: s.points, top5: s.top5, texts: s.svgTexts.length, minFs: Math.min(...s.svgTexts.map((t) => parseFloat(t.fs) || 99)) })), labelOverlaps, sliders, view: view ? { ...bx(view), t: txt(view).slice(0, 120) } : null, sort, firstBarY: firstBar ? bx(firstBar).y : null, bars, eyebrows, compact, banner: bannerInfo, infoTriggers: infoTriggers.length, infoTriggerSample: infoTriggers.slice(0, 4), infoTriggerMinWH: infoTriggers.length ? Math.min(...infoTriggers.map((b) => Math.min(b.w, b.h))) : null, status3d: status3d ? txt(status3d) : null, contextH, headText: headText.slice(0, 500), svgTextColors, priority, topFive: topFive ? { ...bx(topFive), t: txt(topFive).slice(0, 200) } : null, html: document.documentElement.outerHTML.length };
`);
const imgExtra = new Function(`${bxFn}
  const q = (s) => document.querySelector(s); const all = (s) => [...document.querySelectorAll(s)];
  const main = document.querySelector('main') || document.body;
  const heads = [...main.querySelectorAll('h1, h2, h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 90), y: bx(h).y }));
  const firstTable = main.querySelector('table'); const firstSvg = [...main.querySelectorAll('svg')].filter((s) => vis(s) && s.getBoundingClientRect().width > 100)[0];
  const radars = all('[data-bh-jev14-radar], [data-bh-imagejev-radar], [data-bh-ijb-radar]').length;
  const selects = all('select, input[list], [role=combobox]').map((s) => ({ ...bx(s), lbl: (s.getAttribute('aria-label') || s.id || '').slice(0, 40) }));
  const imgs = [...main.querySelectorAll('img')].filter(vis).map((i) => ({ ...bx(i), alt: (i.alt || '').slice(0, 40) }));
  const banner = q('[data-bh-fastlane-expanded]');
  const bannerInfo = banner ? { ...bx(banner), fixed: getComputedStyle(banner).position, expanded: banner.getAttribute('data-bh-fastlane-expanded'), t: txt(banner).slice(0, 200) } : null;
  const firstScreen = [...main.querySelectorAll('h1, h2, h3, p, summary, li, button')].filter((e) => vis(e) && e.getBoundingClientRect().top + scrollY < 900).map((e) => e.tagName + ' ' + txt(e).slice(0, 110));
  return { heads, firstTable: firstTable ? { ...bx(firstTable), rows: firstTable.querySelectorAll('tbody tr').length, cols: firstTable.querySelectorAll('thead th').length } : null, firstSvg: firstSvg ? bx(firstSvg) : null, radars, selects, imgs: imgs.length, imgSample: imgs.slice(0, 6), banner: bannerInfo, firstScreen };
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
  const fullOnce = async (name) => { if (kind === 'desktop' && theme === 'light') await rec(name + '-full', true); };
  const vpAt = async (name, loc, dy = -8) => { try { await loc.first().evaluate((el, d) => { window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d); }, dy); await p.waitForTimeout(500); await rec(name); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return; try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };
  const scrollThrough = async () => { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } window.scrollTo(0, 0); }); await p.waitForTimeout(1500); };
  const flush = async () => fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}-${tag}.json`, JSON.stringify(metrics, null, 1));

  await step('hub', async () => {
    await go('/jev-models'); await rec('hub'); await rec('hub-scrolled-0');
    metrics.shots[`${tag}-hub-extra-fresh`] = await p.evaluate(hubExtra);
    await scrollThrough(); await settle();
    metrics.shots[`${tag}-hub-geom`] = await p.evaluate(pageGeom); metrics.shots[`${tag}-hub-extra`] = await p.evaluate(hubExtra);
    await fullOnce('hub');
    await vpAt('hub-class-vp', p.locator('[data-bh-jev-class-summary], [data-bh-jev-class-rule]').first(), -40);
    await vpAt('hub-caprows-vp', p.locator('[data-bh-jev14-capability-row]').first(), -120);
    await vpAt('hub-divider-vp', p.locator('[data-bh-jev-class-divider]'), -300);
    await vpAt('hub-scatter-vp', p.locator('[data-bh-jev14-scatter]').first(), -60);
    await vpAt('hub-scatter2-vp', p.locator('[data-bh-jev14-scatter]').nth(1), -60);
    await vpAt('hub-chart-vp', p.locator('[data-bh-jev14-chart]'), -60);
    await vpAt('hub-sliders-vp', p.locator('input[type=range]').first(), -160);
    await vpAt('hub-table-vp', p.locator('[data-bh-jev14-table]'), -80);
    await vpAt('hub-compare-vp', p.locator('[data-bh-jev14-compare]'), -12);
    await vpAt('hub-3d-vp', p.locator('[data-bh-jev14-capability-3d]'), -20);
    await vpAt('hub-context-vp', p.getByRole('heading', { name: /context/i }).first(), -20);
    // an open ⓘ row note
    try { const t = p.locator('[data-bh-jev14-capability-row] button, [data-bh-jev14-capability-row] summary').first(); await t.scrollIntoViewIfNeeded(); await t.click(); await p.waitForTimeout(700); await rec('hub-rownote-open'); metrics.shots[`${tag}-hub-rownote`] = await p.evaluate(new Function(`${bxFn} const d = document.querySelector('[role=dialog], [data-bh-jev14-notes][open], details[open][data-bh-jev14-notes], [data-bh-jev14-notes]'); return d ? { ...bx(d), t: txt(d).slice(0, 300), vis: !!vis(d) } : null;`)); } catch (e) { metrics.shots[`${tag}-hub-rownote-err`] = String(e).slice(0, 200); }
    // move a weight slider
    try { const s = p.locator('input[type=range]').first(); await s.scrollIntoViewIfNeeded(); await s.evaluate((el) => { el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(900); await vpAt('hub-slider-moved', s, -160); metrics.shots[`${tag}-hub-slider-moved-extra`] = await p.evaluate(hubExtra); } catch (e) { metrics.shots[`${tag}-hub-slider-err`] = String(e).slice(0, 200); }
  });
  await step('v142', async () => { await go('/jev-models/v1.4.2'); await rec('v142'); await scrollThrough(); metrics.shots[`${tag}-v142-geom`] = await p.evaluate(pageGeom); metrics.shots[`${tag}-v142-extra`] = await p.evaluate(hubExtra); await fullOnce('v142'); });
  await step('img', async () => {
    await go('/image-jev-bench'); await rec('img'); metrics.shots[`${tag}-img-extra-fresh`] = await p.evaluate(imgExtra);
    await scrollThrough(); await settle(); metrics.shots[`${tag}-img-geom`] = await p.evaluate(pageGeom); metrics.shots[`${tag}-img-extra`] = await p.evaluate(imgExtra);
    await fullOnce('img');
    await vpAt('img-table-vp', p.locator('main table').first(), -80);
    await vpAt('img-radar-vp', p.locator('[data-bh-jev14-radar], [data-bh-imagejev-radar], [data-bh-ijb-radar], main svg').first(), -40);
    await vpAt('img-examples-vp', p.locator('main img').first(), -60);
  });
  await step('banner', async () => {
    await go('/jev-models'); await rec('banner-fresh');
    metrics.shots[`${tag}-banner`] = await p.evaluate(new Function(`${bxFn} const b = document.querySelector('[data-bh-fastlane-expanded]'); if (!b) return null; const btns = [...b.querySelectorAll('button, a')].map((x) => ({ t: txt(x).slice(0, 40), ...bx(x), fs: getComputedStyle(x).fontSize })); const under = document.elementFromPoint(innerWidth / 2, innerHeight - 4); return { ...bx(b), pos: getComputedStyle(b).position, expanded: b.getAttribute('data-bh-fastlane-expanded'), t: txt(b).slice(0, 300), btns, bg: getComputedStyle(b).backgroundColor, color: getComputedStyle(b).color, minFont: minFont(b), under: under ? under.tagName + '.' + String(under.className).slice(0, 40) : null, bodyPad: getComputedStyle(document.body).paddingBottom };`));
    try { const exp = p.locator('[data-bh-fastlane-expanded="false"] button').first(); if (await exp.count()) { await exp.click(); await p.waitForTimeout(600); await rec('banner-expanded'); metrics.shots[`${tag}-banner-expanded`] = await p.evaluate(new Function(`${bxFn} const b = document.querySelector('[data-bh-fastlane-expanded]'); return b ? { ...bx(b), expanded: b.getAttribute('data-bh-fastlane-expanded'), t: txt(b).slice(0, 400), btns: [...b.querySelectorAll('button, a')].map((x) => ({ t: txt(x).slice(0, 40), ...bx(x) })), minFont: minFont(b) } : null;`)); } } catch (e) { metrics.shots[`${tag}-banner-expanded-err`] = String(e).slice(0, 200); }
  });
  await step('simple', async () => { await go('/'); await rec('simple'); metrics.shots[`${tag}-simple-geom`] = await p.evaluate(pageGeom); await fullOnce('simple'); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); metrics.shots[`${tag}-advanced-geom`] = await p.evaluate(pageGeom); });
  await step('wizard', async () => { await go('/'); const t = p.getByRole('tab', { name: /wizard|assistant|guided/i }); if (await t.count()) { await t.first().click(); await p.waitForTimeout(1200); await rec('wizard'); } else { const l = p.getByRole('link', { name: /wizard|assistant|guided/i }); if (await l.count()) { await l.first().click(); await p.waitForTimeout(1500); await rec('wizard'); } else metrics.shots[`${tag}-wizard-err`] = 'no wizard entry found'; } });
  await step('bmx', async () => { await go('/benchmaxxing'); await rec('bmx'); metrics.shots[`${tag}-bmx-geom`] = await p.evaluate(pageGeom); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); metrics.shots[`${tag}-model-geom`] = await p.evaluate(pageGeom); });
  await step('bench', async () => { await go('/benchmarks'); await rec('bench'); metrics.shots[`${tag}-bench-geom`] = await p.evaluate(pageGeom); });
  await flush();
  await c.close(); await b.close();
}
await fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}${process.env.CTX ? '-' + process.env.CTX : ''}.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null && !v.body ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 4000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
