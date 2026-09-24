// Fable pass-34 screenshot matrix: what changed since pass 33 — the JevBench hub after F-171–F-175/F-179 and CR-142 (cost log axis, dark-mode
// SVG fills, context-limit chart, new input buckets), the per-system pages after F-171, the CR-136 SEO pages (alternatives, chooser, Jev-vs),
// the CR-141 multimodal preview, the CR-140 request-evaluation page, the CR-139.2 cost modal — plus the quick views (Simple, Advanced, wizard,
// Benchmaxxing, a model page). 1440/390 × light/dark.  Usage: node shoot-fable-pass34.mjs <base> <out>   (ONLY=<step prefix>, CTX=<kind_theme>)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260924-pass34/canonical';
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
const underscoreWords = (root) => [...(root || document).querySelectorAll('p, li, td, th, h1, h2, h3, summary, dt, dd, span')].map((e) => txt(e)).filter((t) => t && t.length < 300 && /\\b[a-z]+_[a-z_]+\\b/.test(t)).map((t) => (t.match(/\\b[a-z]+_[a-z_]+\\b/) || [''])[0]).slice(0, 6);`;
const pageGeom = new Function(`${bxFn}
  const main = document.querySelector('main') || document.body; const q = (s) => main.querySelector(s);
  const heads = [...main.querySelectorAll('h1, h2, h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 90), y: Math.round(h.getBoundingClientRect().y + scrollY), fs: getComputedStyle(h).fontSize }));
  const tables = [...main.querySelectorAll('table')].filter(vis).map((t) => ({ rows: t.querySelectorAll('tbody tr').length, cols: t.querySelectorAll('thead th').length, ...bx(t), links: t.querySelectorAll('a[href^="/jev-models/"]').length, wrapOverflow: t.parentElement.scrollWidth > t.parentElement.clientWidth + 2 }));
  const svgs = [...main.querySelectorAll('svg')].filter(vis).map((s) => ({ ...bx(s), lbl: (s.getAttribute('aria-label') || s.getAttribute('role') || '').slice(0, 40) })).filter((s) => s.w > 40);
  const details = [...main.querySelectorAll('details')].map((d) => ({ s: txt(d.querySelector('summary')).slice(0, 70), open: d.open, y: Math.round(d.getBoundingClientRect().y + scrollY) }));
  const firstScreen = [...main.querySelectorAll('h1, h2, h3, p, summary, li')].filter((e) => vis(e) && e.getBoundingClientRect().top + scrollY < 900).map((e) => e.tagName + ' ' + txt(e).slice(0, 110));
  const guides = [...main.querySelectorAll('[data-bh-jev-guides], [data-bh-jev-board-guides]')].map((g) => ({ links: [...g.querySelectorAll('a')].map((a) => a.getAttribute('href')), self: [...g.querySelectorAll('a')].some((a) => a.getAttribute('href') === location.pathname) }));
  const back = [...main.querySelectorAll('a')].map((a) => txt(a)).filter((t) => /^←/.test(t));
  const bars = main.querySelectorAll('[role=progressbar], [data-bh-jev-alternatives-bars] *[style*="width"]').length;
  const words = txt(main).split(' ').length;
  return { title: document.title, url: location.pathname + location.search, heads, tables, svgs: svgs.length, svgSample: svgs.slice(0, 12), details, firstScreen, guides, back, bars, words, links: main.querySelectorAll('a[href]').length, buttons: main.querySelectorAll('button').length, minFont: minFont(main), overflow: overflow(main), plural1: plural1(main), underscore: underscoreWords(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
const hubExtra = new Function(`${bxFn}
  const q = (s) => document.querySelector(s); const all = (s) => [...document.querySelectorAll(s)];
  const suite = q('[data-bh-jev14-capability-suite]');
  const capText = suite ? txt(suite) : null;
  const costAxis = q('[data-bh-jev14-cost-axis]');
  const scatter = all('[data-bh-jev14-scatter]').map((s) => ({ ...bx(s), points: s.querySelectorAll('[data-bh-jev14-point]').length, top5: s.querySelectorAll('[data-bh-jev14-scatter-top-five]').length, svgTexts: [...s.querySelectorAll('svg text')].filter(vis).length }));
  const svgTextColors = [...document.querySelectorAll('svg text')].filter(vis).slice(0, 400).map((t) => getComputedStyle(t).fill).reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});
  const contextH = [...document.querySelectorAll('h2, h3')].filter((h) => /context/i.test(txt(h))).map((h) => ({ t: txt(h).slice(0, 90), y: bx(h).y }));
  const credit = q('#credit'); const creditText = credit ? txt(credit).slice(0, 400) : null;
  const status3d = q('[data-bh-jev14-capability-3d-status]');
  const licence = (document.body.innerText.match(/three\\.js[^.]*\\./g) || []);
  const head = q('main .bh-page-head') || q('main header'); const headText = head ? txt(head) : '';
  const firstBar = q('[data-bh-jev14-bar]'); const rows = all('[data-bh-jev14-row]').length; const rowLinks = all('[data-bh-jev14-row] th a[href^="/jev-models/"]').length;
  const compare = q('[data-bh-jev14-compare]'); const missing = all('[data-bh-jev14-radar-missing]').map((m) => txt(m).slice(0, 120));
  const radarLabelsDash = [...document.querySelectorAll('[data-bh-jev14-radar] text')].map((t) => txt(t)).filter((t) => /—\\s*$/.test(t)).length;
  const history = q('[data-bh-jev13-history]');
  const priority = q('[data-bh-priority-evaluation-link]');
  return { capText: capText ? capText.slice(0, 600) : null, capWords: capText ? capText.split(' ').length : null, costAxis: costAxis ? { ...bx(costAxis), t: txt(costAxis).slice(0, 120) } : null, scatter, svgTextColors, contextH, creditText, status3d: status3d ? txt(status3d) : null, licence, headSize534: (headText.match(/534 public/g) || []).length, headText: headText.slice(0, 500), firstBarY: firstBar ? bx(firstBar).y : null, rows, rowLinks, compare: compare ? bx(compare) : null, missing, radarLabelsDash, history: history ? { open: history.open, ...bx(history), t: txt(history).slice(0, 200) } : null, priority: priority ? txt(priority) : null, html: document.documentElement.outerHTML.length };
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

  await step('hub', async () => {
    await go('/jev-models'); await rec('hub'); await scrollThrough(); await settle();
    metrics.shots[`${tag}-hub-geom`] = await p.evaluate(pageGeom); metrics.shots[`${tag}-hub-extra`] = await p.evaluate(hubExtra);
    await fullOnce('hub');
    await vpAt('hub-chart-vp', p.locator('[data-bh-jev14-chart]'), -60);
    await vpAt('hub-table-vp', p.locator('[data-bh-jev14-table]'), -80);
    await vpAt('hub-compare-vp', p.locator('[data-bh-jev14-compare]'), -12);
    await vpAt('hub-radars-vp', p.locator('[data-bh-jev14-radar]').first(), -40);
    await vpAt('hub-cap-vp', p.locator('[data-bh-jev14-capability-chart]').first(), -60);
    await vpAt('hub-scatter-vp', p.locator('[data-bh-jev14-scatter]').first(), -60);
    await vpAt('hub-3d-vp', p.locator('[data-bh-jev14-capability-3d]'), -20);
    await vpAt('hub-context-vp', p.getByRole('heading', { name: /context/i }).first(), -20);
    await vpAt('hub-changed-vp', p.getByRole('heading', { name: /What changed in v1\.4/ }).first(), -12);
    await vpAt('hub-credit-vp', p.locator('#credit'), -200);
  });
  for (const key of ['jevk5-v02', 'hopper']) await step('sys-' + key, async () => { await go(`/jev-models/${key}`); await rec('sys-' + key); await scrollThrough(); metrics.shots[`${tag}-sys-${key}-geom`] = await p.evaluate(pageGeom); await fullOnce('sys-' + key); });
  await step('mm', async () => { await go('/jev-models/multimodal-preview'); await rec('mm'); await scrollThrough(); metrics.shots[`${tag}-mm-geom`] = await p.evaluate(pageGeom); await fullOnce('mm'); await vpAt('mm-ranking-vp', p.locator('[data-bh-mm-ranking]'), -40); await vpAt('mm-track-vp', p.locator('[data-bh-mm-preview-track]'), -40); });
  await step('req', async () => { await go('/jev-models/request-evaluation'); await rec('req'); await scrollThrough(); metrics.shots[`${tag}-req-geom`] = await p.evaluate(pageGeom); await fullOnce('req'); await vpAt('req-form-vp', p.locator('#priority-request-form'), -20); });
  await step('alt', async () => { await go('/jev-models/alternatives'); await rec('alt'); await scrollThrough(); metrics.shots[`${tag}-alt-geom`] = await p.evaluate(pageGeom); await fullOnce('alt'); await vpAt('alt-table-vp', p.locator('[data-bh-jev-alternatives-table]'), -40); });
  await step('choose', async () => { await go('/jev-models/how-to-choose'); await rec('choose'); await scrollThrough(); metrics.shots[`${tag}-choose-geom`] = await p.evaluate(pageGeom); await fullOnce('choose'); });
  await step('vs', async () => { await go('/jev-models/jev-vs-hopper'); await rec('vs'); await scrollThrough(); metrics.shots[`${tag}-vs-geom`] = await p.evaluate(pageGeom); await fullOnce('vs'); await vpAt('vs-radars-vp', p.locator('[data-bh-jev14-radar]').first(), -40); });
  await step('cost', async () => {
    await go('/models/claude-fable-5.1::max'); await scrollThrough();
    const opened = await p.evaluate(() => { const b = [...document.querySelectorAll('button[aria-haspopup="dialog"]')].find((x) => /Google Vertex AI \/ Google Vertex AI/.test(x.getAttribute('aria-label') || '')); if (!b) return null; b.click(); return b.getAttribute('aria-label'); });
    await p.waitForTimeout(1200);
    metrics.shots[`${tag}-cost-modal`] = await p.evaluate(new Function(`${bxFn} const d = document.querySelector('[role=dialog]'); if (!d) return null; const ul = d.querySelector('[data-testid="cost-sources"]'); return { ...bx(d), h1: txt(d.querySelector('h1, h2, h3')), words: txt(d).split(' ').length, sources: ul ? [...ul.querySelectorAll('li')].map((li) => txt(li).slice(0, 220)) : [], minFont: minFont(d), overflow: overflow(d), lines: [...d.querySelectorAll('p, li')].filter(vis).map((e) => ({ t: txt(e).slice(0, 80), n: lines(e) })).filter((x) => x.n > 3) };`));
    metrics.shots[`${tag}-cost-opened`] = opened;
    await rec('cost-modal');
  });
  await step('simple', async () => { await go('/'); await rec('simple'); metrics.shots[`${tag}-simple-geom`] = await p.evaluate(pageGeom); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('wizard', async () => { await go('/'); const t = p.getByRole('tab', { name: /wizard|assistant|guided/i }); if (await t.count()) { await t.first().click(); await p.waitForTimeout(1200); await rec('wizard'); } else { const l = p.getByRole('link', { name: /wizard|assistant|guided/i }); if (await l.count()) { await l.first().click(); await p.waitForTimeout(1500); await rec('wizard'); } else metrics.shots[`${tag}-wizard-err`] = 'no wizard entry found'; } });
  await step('bmx', async () => { await go('/benchmaxxing'); await rec('bmx'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); });
  await c.close(); await b.close();
  await fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}${process.env.CTX ? '-' + process.env.CTX : ''}.json`, JSON.stringify(metrics, null, 1));
}
if (!process.env.CTX) await fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null && !v.body ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 5000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
