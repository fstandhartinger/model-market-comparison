// Fable pass-37 screenshot matrix: what changed since pass 36 — the JevBench hub after F-197 (guides fold), F-199 (phone folds the Composite
// controls), F-200 (Capability ⓘ as a list / modal) and CR-176.1–.6 (bubble separator label + ← → hints, median-latency speed, $/1k decisions
// pills, 3D axis + top-five labels); /image-jev-bench after F-198; the hidden CR-172 v1.5 preview; plus the quick views on today's data.
// Usage: node shoot-fable-pass37.mjs <base> <out>   (ONLY=<step prefix>, CTX=<kind_theme>)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260926-pass37/canonical';
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

const bubbleExtra = new Function(`${bxFn}
  const all = (s) => [...document.querySelectorAll(s)];
  const out = [];
  for (const sec of all('[data-bh-jev-bubble]')) {
    const kind = sec.getAttribute('data-bh-jev-bubble'); const svg = sec.querySelector('svg'); if (!svg) { out.push({ kind, svg: null }); continue; }
    const sb = svg.getBoundingClientRect();
    const sep = svg.querySelector('[data-bh-jev-separator]');
    const sepLine = sep ? sep.querySelector('line, path') : null; const sepX = sepLine ? sepLine.getBoundingClientRect().x : null;
    const sepTexts = sep ? [...sep.querySelectorAll('text')].map((t) => ({ t: txt(t), ...bx(t), fs: getComputedStyle(t).fontSize, anchor: t.getAttribute('text-anchor') })) : [];
    const pts = all('[data-bh-jev-bubble-point]').filter((p) => svg.contains(p)).map((p) => { const r = p.getBoundingClientRect(); return { k: p.getAttribute('data-bh-jev-bubble-point'), cx: Math.round(r.x + r.width / 2), left: sepX != null && (r.x + r.width / 2) < sepX }; });
    const texts = [...svg.querySelectorAll('text')].filter(vis).map((t) => ({ t: txt(t).slice(0, 30), fs: parseFloat(getComputedStyle(t).fontSize), ...bx(t) }));
    const small = texts.filter((t) => t.fs < 10).map((t) => t.t + '@' + t.fs);
    const labels = all('[data-bh-jev-bubble-label]').filter((l) => svg.contains(l)).map((l) => ({ ...bx(l), t: txt(l).slice(0, 30) }));
    let ov = 0; for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], b = labels[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) ov++; }
    const axis = texts.filter((t) => /cheaper|faster|Capability|decisions|speed/i.test(t.t)).map((t) => t.t + '@' + t.fs);
    out.push({ kind, svg: bx(svg), sepX: sepX != null ? Math.round(sepX) : null, sepTexts, points: pts.length, leftOfLine: pts.filter((p) => p.left).length, leftKeys: pts.filter((p) => p.left).map((p) => p.k).slice(0, 8), minFs: Math.min(...texts.map((t) => t.fs)), small, labels: labels.length, overlaps: ov, axis });
  }
  const chk = document.querySelector('[data-bh-jev-bubble-show-outside]');
  return { charts: out, showOutside: chk ? chk.checked : null, hint: txt(document.querySelector('[data-bh-jev-bubbles] p')) };
`);
const tableExtra = new Function(`${bxFn}
  const all = (s) => [...document.querySelectorAll(s)];
  const cells = all('[data-bh-jev14-cost-cell]').slice(0, 60).map((c) => { const pill = c.querySelector('.bh-thin-tag'); const td = c.closest('td, li, div'); const tdCs = td ? getComputedStyle(td) : null; const num = [...c.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join('') || txt(c); const cb = bx(c); const pb = pill ? bx(pill) : null; return { t: txt(c).slice(0, 30), pill: pill ? txt(pill) : null, pillLeft: pb ? pb.x + pb.w <= cb.x + cb.w - 20 : null, right: cb.x + cb.w, heat: td ? (td.className || '').includes('bh-heat') || (tdCs.backgroundImage !== 'none') : null, align: tdCs ? tdCs.textAlign : null, fs: getComputedStyle(c).fontSize }; });
  const rights = cells.map((c) => c.right); const distinctRight = [...new Set(rights)].length;
  const ths = all('table th').map((t) => txt(t)).filter((t) => /1k|decisions/i.test(t));
  const sortBtns = all('button').filter((b) => /^Sort by/i.test(txt(b))).map((b) => txt(b).slice(0, 40));
  const presets = document.querySelector('.bh-jev-presetrow'); const presetRow = presets ? { ...bx(presets), sw: presets.scrollWidth, cw: presets.clientWidth } : null;
  const weightsMore = all('[data-bh-jev-weights-more]').map((d) => ({ open: d.open, s: txt(d.querySelector('summary')).slice(0, 40), ...bx(d) }));
  const rangesVis = all('input[type=range]').filter(vis).length;
  const chartH2 = document.querySelector('[data-bh-jev14-chart]'); const firstBar = document.querySelector('[data-bh-jev14-bar]');
  const chartHead = chartH2 ? chartH2.closest('section, figure, div') : null; const h2 = chartHead ? chartHead.querySelector('h2') : null;
  return { cells: cells.slice(0, 12), n: cells.length, distinctRight, pillsLeft: cells.filter((c) => c.pill).length, pillsNotLeft: cells.filter((c) => c.pill && c.pillLeft === false).length, heatCells: cells.filter((c) => c.heat).length, ths, sortBtns, presetRow, weightsMore, rangesVis, h2ToBar: h2 && firstBar ? bx(firstBar).y - bx(h2).y : null, official: all('.bh-jevc-official').length };
`);
const threeExtra = new Function(`${bxFn}
  const all = (s) => [...document.querySelectorAll(s)];
  const box = document.querySelector('[data-bh-jev14-capability-3d]'); if (!box) return null;
  const canvas = box.querySelector('canvas'); const fb = box.querySelector('[data-bh-jev14-3d-fallback]');
  const axisL = all('[data-bh-jev14-3d-axis-label]').map((e) => ({ t: txt(e).slice(0, 50), ...bx(e), fs: getComputedStyle(e).fontSize, vis: !!vis(e) || e.getBoundingClientRect().width > 0 }));
  const modelL = all('[data-bh-jev14-3d-model-label]').map((e) => ({ t: txt(e).slice(0, 40), ...bx(e), fs: getComputedStyle(e).fontSize }));
  let ov = 0; for (let i = 0; i < modelL.length; i++) for (let j = i + 1; j < modelL.length; j++) { const a = modelL[i], b = modelL[j]; if (a.w && b.w && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) ov++; }
  const status = document.querySelector('[data-bh-jev14-capability-3d-status]');
  const legend = box.querySelector('.pointer-events-none.absolute');
  return { box: bx(box), canvas: !!canvas, fallback: !!fb, axisL, modelL, overlaps: ov, status: status ? txt(status).slice(0, 120) : null, legend: legend ? { ...bx(legend), t: txt(legend).slice(0, 200) } : null, minFs: Math.min(...[...axisL, ...modelL].map((l) => parseFloat(l.fs) || 99)) };
`);
const capTipExtra = new Function(`${bxFn}
  const d = [...document.querySelectorAll('[role=dialog]')].find(vis); const tip = [...document.querySelectorAll('[data-bh-jev-capability-tooltip], [role=tooltip]')].find(vis);
  const src = d || tip; const li = document.querySelector('[data-bh-jev14-capability-row]');
  return { dialog: !!d, tip: !!tip, dts: src ? src.querySelectorAll('dt').length : 0, close: !!(d && d.querySelector('button[aria-label="Close"]')), box: src ? bx(src) : null, t: src ? txt(src).slice(0, 300) : null, liTitle: li ? (li.getAttribute('title') || '').length : null, heading: src ? txt(src.querySelector('h2, h3, h4, strong, [class*=font-semibold]')) : null };
`);
const v15Extra = new Function(`${bxFn}
  const main = document.querySelector('main') || document.body;
  const robots = document.querySelector('meta[name=robots]'); const heads = [...main.querySelectorAll('h1, h2, h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 90), y: bx(h).y }));
  const tables = [...main.querySelectorAll('table')].filter(vis).map((t) => ({ rows: t.querySelectorAll('tbody tr').length, cols: t.querySelectorAll('thead th').length, ...bx(t), wrapOverflow: t.parentElement.scrollWidth > t.parentElement.clientWidth + 2 }));
  const firstScreen = [...main.querySelectorAll('h1, h2, h3, p, summary, li, button')].filter((e) => vis(e) && e.getBoundingClientRect().top + scrollY < 900).map((e) => e.tagName + ' ' + txt(e).slice(0, 120));
  return { robots: robots ? robots.content : null, heads, tables, svgs: [...main.querySelectorAll('svg')].filter((s) => vis(s) && s.getBoundingClientRect().width > 60).length, firstScreen, words: txt(main).split(' ').length, minFont: minFont(main), overflow: overflow(main), plural1: plural1(main), underscore: underscoreWords(main), links: main.querySelectorAll('a[href]').length, iframes: main.querySelectorAll('iframe').length, body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
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
    await go('/jev-models'); await rec('hub');
    metrics.shots[`${tag}-hub-extra-fresh`] = await p.evaluate(hubExtra);
    metrics.shots[`${tag}-hub-guides`] = await p.evaluate(new Function(`${bxFn} const g = document.querySelector('[data-bh-jev-board-guides]'); if (!g) return null; const links = [...g.querySelectorAll('a')]; const tog = g.querySelector('button, summary'); const method = document.querySelector('#jev-class-method'); const head = document.querySelector('main .bh-page-head'); return { links: links.length, visibleLinks: links.filter(vis).length, toggle: tog ? { t: txt(tog).slice(0, 40), vis: !!vis(tog), ...bx(tog) } : null, afterMethod: method ? !!(method.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING) : null, inHead: head ? head.contains(g) : null, headLinks: head ? head.querySelectorAll('a').length : null, headH: head ? bx(head).h : null };`));
    await scrollThrough(); await settle();
    metrics.shots[`${tag}-hub-geom`] = await p.evaluate(pageGeom); metrics.shots[`${tag}-hub-extra`] = await p.evaluate(hubExtra);
    metrics.shots[`${tag}-hub-bubbles`] = await p.evaluate(bubbleExtra);
    metrics.shots[`${tag}-hub-table`] = await p.evaluate(tableExtra);
    metrics.shots[`${tag}-hub-3d`] = await p.evaluate(threeExtra);
    await fullOnce('hub');
    await vpAt('hub-caprows-vp', p.locator('[data-bh-jev14-capability-row]').first(), -120);
    await vpAt('hub-guides-vp', p.locator('[data-bh-jev-board-guides]'), -200);
    await vpAt('hub-scatter-vp', p.locator('[data-bh-jev-bubble="cost"]').first(), -20);
    await vpAt('hub-scatter2-vp', p.locator('[data-bh-jev-bubble="latency"], [data-bh-jev-bubble="speed"]').first(), -20);
    await vpAt('hub-chart-vp', p.locator('[data-bh-jev14-chart]'), -60);
    await vpAt('hub-chart-bars-vp', p.locator('[data-bh-jev14-bar]').first(), -100);
    await vpAt('hub-table-vp', p.locator('[data-bh-jev14-table]'), -80);
    await vpAt('hub-axes-vp', p.getByRole('heading', { name: /Axes, accuracy/i }).first(), -20);
    await vpAt('hub-3d-vp', p.locator('[data-bh-jev14-capability-3d]'), -20);
    await p.waitForTimeout(1500); metrics.shots[`${tag}-hub-3d-settled`] = await p.evaluate(threeExtra); await rec('hub-3d-settled');
    // guides open
    try { const t = p.locator('[data-bh-jev-board-guides] button, [data-bh-jev-board-guides] summary').first(); await t.scrollIntoViewIfNeeded(); await t.click(); await p.waitForTimeout(500); await vpAt('hub-guides-open', p.locator('[data-bh-jev-board-guides]'), -100); } catch (e) { metrics.shots[`${tag}-hub-guides-open-err`] = String(e).slice(0, 200); }
    // the Capability ⓘ
    try { const t = p.locator('[data-bh-jev14-capability-row] button').first(); await t.scrollIntoViewIfNeeded(); if (mobile) await t.tap(); else await t.hover(); await p.waitForTimeout(700); await rec('hub-rownote-open'); metrics.shots[`${tag}-hub-rownote`] = await p.evaluate(capTipExtra); if (mobile) { const cl = p.locator('[role=dialog] button[aria-label="Close"]').first(); if (await cl.count()) await cl.tap(); } else await p.mouse.move(5, 5); await p.waitForTimeout(400); } catch (e) { metrics.shots[`${tag}-hub-rownote-err`] = String(e).slice(0, 200); }
    // show outside toggle in bubbles
    try { const cb = p.locator('[data-bh-jev-bubble-show-outside]'); await cb.scrollIntoViewIfNeeded(); await cb.check(); await p.waitForTimeout(800); metrics.shots[`${tag}-hub-bubbles-outside`] = await p.evaluate(bubbleExtra); await vpAt('hub-scatter-outside', p.locator('[data-bh-jev-bubble="cost"]').first(), -20); await cb.uncheck(); } catch (e) { metrics.shots[`${tag}-hub-outside-err`] = String(e).slice(0, 200); }
    // phone: presets row + weights disclosure
    if (mobile) { try { const d = p.locator('[data-bh-jev-weights-more]').first(); await d.scrollIntoViewIfNeeded(); await rec('hub-weights-closed'); await d.locator('summary').tap(); await p.waitForTimeout(500); await rec('hub-weights-open'); } catch (e) { metrics.shots[`${tag}-hub-weights-err`] = String(e).slice(0, 200); } }
  });
  await step('hubw', async () => { await go('/jev-models?w=40-20-20-20'); await scrollThrough(); metrics.shots[`${tag}-hubw-table`] = await p.evaluate(tableExtra); await vpAt('hubw-chart-vp', p.locator('[data-bh-jev14-chart]'), -60); });
  await step('img', async () => {
    await go('/image-jev-bench'); await rec('img'); metrics.shots[`${tag}-img-extra-fresh`] = await p.evaluate(imgExtra);
    await scrollThrough(); await settle(); metrics.shots[`${tag}-img-geom`] = await p.evaluate(pageGeom); metrics.shots[`${tag}-img-extra`] = await p.evaluate(imgExtra);
    metrics.shots[`${tag}-img-f198`] = await p.evaluate(new Function(`${bxFn} const main = document.querySelector('main'); const gated = [...document.querySelectorAll('[data-bh-mm-gated]')].map((e) => ({ g: e.getAttribute('data-bh-mm-gated'), t: txt(e).slice(0, 80), fs: getComputedStyle(e).fontSize })); const zero = [...main.querySelectorAll('li, tr')].filter((e) => /\\b0\\.00?\\b/.test(txt(e)) && !/gated/i.test(txt(e))).length; const approved = /approved/i.test(txt(main)); const det = [...main.querySelectorAll('details')].map((d) => ({ s: txt(d.querySelector('summary')).slice(0, 60), open: d.open })); const ths = [...main.querySelectorAll('table')].map((t) => [...t.querySelectorAll('thead th')].map((h) => txt(h).slice(0, 20))); const bold = [...main.querySelectorAll('b, strong')].filter((e) => /\\(/.test(txt(e))).map((e) => txt(e).slice(0, 60)); return { gated, zero, approved, det, ths, bold, h: document.documentElement.scrollHeight };`));
    await fullOnce('img');
    await vpAt('img-bars-vp', p.locator('main svg, main [role=img]').first(), -60);
    await vpAt('img-table-vp', p.locator('main table').first(), -80);
    await vpAt('img-gated-vp', p.locator('[data-bh-mm-gated]').first(), -300);
  });
  await step('v15', async () => {
    await go('/wip-oiifi41ouv1f/jevbench-v15'); await rec('v15'); await scrollThrough(); metrics.shots[`${tag}-v15-geom`] = await p.evaluate(v15Extra); await fullOnce('v15');
    const heads = metrics.shots[`${tag}-v15-geom`].heads || []; for (let i = 1; i < Math.min(heads.length, 7); i++) { await p.evaluate((y) => window.scrollTo(0, Math.max(0, y - 30)), heads[i].y); await p.waitForTimeout(300); await rec(`v15-h${i}`); }
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
