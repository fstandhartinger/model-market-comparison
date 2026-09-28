// Fable pass-42 probe: what changed since pass 41 — JevBench v1.5.0 is the public hub (CR-203, PR #68; CR-205, PR #69 restored the full
// section structure on /jev-models and /jev-models/v1.5.0), the frozen /jev-models/v1.4.2.2 page, Image JevBench v0.1.3 (CR-199, PR #67).
// The quick views are shot by shoot-fable-pass40.mjs into the same out dir.
// Usage: node shoot-fable-pass42.mjs <base> <out>   (CTX=<kind_theme> restricts the contexts)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260928-pass42/canonical';
await fs.mkdir(OUT, { recursive: true });
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : null;
const vis = (el) => el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };`;
const pageProbe = new Function(`${bxFn}
  const main = document.querySelector('main') || document.body;
  const heads = [...document.querySelectorAll('main h1, main h2, main h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 90), y: bx(h).y }));
  const tables = [...main.querySelectorAll('table')].map((t) => { const wrap = t.parentElement; return { cols: t.querySelectorAll('thead th').length, rows: t.querySelectorAll('tbody tr').length, w: t.getBoundingClientRect().width | 0, wrapCw: wrap.clientWidth, wrapSw: wrap.scrollWidth, scrolls: wrap.scrollWidth > wrap.clientWidth + 2, y: bx(t).y, head: [...t.querySelectorAll('thead th')].map((th) => txt(th).slice(0, 18)).join('|').slice(0, 220) }; });
  const overflow = [...main.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, cls: String(e.className).slice(0, 60), sw: e.scrollWidth, cw: e.clientWidth, y: bx(e).y })).slice(0, 12);
  const allText = txt(main);
  const nan = (allText.match(/NaN|undefined|null%|\\bInfinity\\b/g) || []).length;
  const hexRuns = [...main.querySelectorAll('code, span, p, li, td, dd')].filter((e) => !e.querySelector('code, span, p, li, td, dd')).map((e) => txt(e)).filter((t) => /[0-9a-f]{40,}/.test(t)).map((t) => t.slice(0, 90));
  const versionWords = { v15: (allText.match(/v1\\.5(?:\\.0)?/g) || []).length, v1422: (allText.match(/v1\\.4\\.2\\.2/g) || []).length, v14: (allText.match(/v1\\.4(?![\\.\\d])/g) || []).length, preview: (allText.match(/\\bpreview\\b/gi) || []).length, wip: (allText.match(/work in progress|WIP/g) || []).length, imageVer: (allText.match(/Image JevBench v0\\.1\\.\\d/g) || []).slice(0, 3) };
  const svgs = main.querySelectorAll('svg').length;
  const details = [...main.querySelectorAll('details')].map((d) => ({ open: d.open, s: txt(d.querySelector('summary')).slice(0, 70), y: bx(d).y }));
  const firstScreen = [...main.querySelectorAll('h1, h2, p, li, a, button, span')].filter((e) => vis(e) && bx(e).y < innerHeight && !e.querySelector('h1, h2, p, li, a, button, span')).map((e) => txt(e)).filter(Boolean).join(' | ').slice(0, 900);
  const banner = document.querySelector('[data-bh-fastlane-banner], [class*=fastlane], [role=region][aria-label*=evaluation i]');
  const one = (allText.match(/\\b1 (systems|decisions|models|rows|entries)\\b/g) || []).slice(0, 3);
  const fields = (allText.match(/\\b[a-z]+_[a-z_]+\\b/g) || []).filter((w) => !/^(host_|x_)/.test(w)).slice(0, 8);
  const links = [...main.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /jev|image-jev|whatif|what-if|api\\//.test(h));
  return { title: document.title, canonical: document.querySelector('link[rel=canonical]')?.href ?? null, robots: document.querySelector('meta[name=robots]')?.content ?? null, heads, tables, overflow, nan, hexRuns, versionWords, svgs, details, firstScreen, banner: banner ? bx(banner) : null, one, fields, links: [...new Set(links)].slice(0, 40),
    minFont: minFont(main), words: allText.split(' ').length, body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
// SVG text placement in the compare radars and bubble charts: labels that sit on data points or straddle an axis.
const svgProbe = new Function(`${bxFn}
  const out = [];
  for (const svg of [...document.querySelectorAll('main svg')].filter(vis)) {
    const r = svg.getBoundingClientRect(); if (r.width < 200 || r.height < 120) continue;
    const texts = [...svg.querySelectorAll('text')].filter(vis).map((t) => { const b = t.getBoundingClientRect(); return { t: txt(t).slice(0, 30), x: b.x | 0, y: (b.y + scrollY) | 0, w: b.width | 0, h: b.height | 0, fs: parseFloat(getComputedStyle(t).fontSize), rendered: b.height }; });
    const marks = [...svg.querySelectorAll('circle, rect, polygon, path')].filter(vis).length;
    const pts = [...svg.querySelectorAll('circle')].filter(vis).map((c) => { const b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + scrollY + b.height / 2, r: b.width / 2 }; });
    const hits = []; for (const t of texts) for (const c of pts) { if (c.r > 14) continue; if (c.x > t.x - 2 && c.x < t.x + t.w + 2 && c.y > t.y - 2 && c.y < t.y + t.h + 2) hits.push({ label: t.t, at: [c.x | 0, c.y | 0] }); }
    const overlaps = []; for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) { const a = texts[i], b = texts[j]; if (!a.t || !b.t) continue; const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); if (ox > 3 && oy > 3) overlaps.push([a.t, b.t, ox | 0, oy | 0]); }
    const heading = (() => { let e = svg; while (e && e !== document.body) { const h = e.querySelector(':scope > h2, :scope > h3, :scope > header h2, :scope > header h3'); if (h) return txt(h).slice(0, 60); e = e.parentElement; } return null; })();
    out.push({ heading, box: bx(svg), texts: texts.length, minFs: Math.min(...texts.map((t) => t.rendered > 0 ? t.rendered / 1.2 : 99), 99), marks, hits: hits.slice(0, 6), overlaps: overlaps.slice(0, 6), sample: texts.slice(0, 6).map((t) => t.t) });
  }
  return out;
`);
for (const [kind, theme] of [['desktop', 'light'], ['desktop', 'dark'], ['mobile', 'light'], ['mobile', 'dark']]) {
  if (process.env.CTX && process.env.CTX !== `${kind}_${theme}`) continue;
  const tag = `${kind}_${theme}`;
  const metrics = { base: BASE, at: new Date().toISOString(), ctx: tag, shots: {}, errors: [] };
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: kind === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, deviceScaleFactor: kind === 'mobile' ? 2 : 1, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => metrics.errors.push({ url: p.url(), type: 'pageerror', message: String(e).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors.push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const go = async (path) => { await goto(p, `${BASE}${path}`); await p.waitForTimeout(2500); };
  const shotEl = async (name, el, pad = 60) => { try { if (!el) return; await el.scrollIntoViewIfNeeded(); await p.evaluate((d) => scrollBy(0, -d), pad); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${tag}-${name}.png` }); } catch (e) { metrics.shots[`${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${name}-err`] = String(e).slice(0, 300); } };
  const page = async (name, path, sectionShots = true) => {
    await go(path);
    const m = await p.evaluate(pageProbe); metrics.shots[name] = m;
    metrics.shots[`${name}-svg`] = await p.evaluate(svgProbe);
    await p.screenshot({ path: `${OUT}/${tag}-${name}.png` });
    await p.screenshot({ path: `${OUT}/${tag}-${name}-full.png`, fullPage: true });
    if (sectionShots) for (const h of m.heads.filter((x) => x.t.startsWith('H2'))) { const label = h.t.slice(3).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); await shotEl(`${name}-s-${label}`, p.locator('main h2', { hasText: h.t.slice(3, 40) }).first(), 16); }
  };
  await step('hub', () => page('hub', '/jev-models'));
  await step('hub-compare', async () => {
    // Open the compare pickers' first radar and the costs disclosure, as a reader would.
    const d = p.locator('main details', { hasText: /cost|basis|What-If|method/i }).first();
    if (await d.count()) { await d.locator('summary').first().click(); await p.waitForTimeout(500); await shotEl('hub-details-open', d, 16); }
  });
  await step('v150', () => page('v150', '/jev-models/v1.5.0', false));
  await step('v1422', () => page('v1422', '/jev-models/v1.4.2.2', false));
  await step('img', () => page('img', '/image-jev-bench', false));
  await step('whatif', async () => { await go('/wip-oiifi41ouv1f/jevbench-v15-whatif.html'); metrics.shots['whatif'] = await p.evaluate(pageProbe); metrics.shots['whatif-svg'] = await p.evaluate(svgProbe); await p.screenshot({ path: `${OUT}/${tag}-whatif.png` }); });
  await step('preview', async () => { await go('/wip-oiifi41ouv1f/jevbench-v15'); metrics.shots['preview'] = await p.evaluate(pageProbe); await p.screenshot({ path: `${OUT}/${tag}-preview.png` }); });
  await fs.writeFile(`${OUT}/metrics-p42-${tag}.json`, JSON.stringify(metrics, null, 1));
  const h = metrics.shots.hub || {};
  console.log(tag, JSON.stringify({ errors: metrics.errors.length, heads: (h.heads || []).length, tables: (h.tables || []).length, overflow: (h.overflow || []).length, nan: h.nan, minFont: h.minFont, words: h.words, hpx: h.body?.h, sw: h.body?.sw, errs: Object.keys(metrics.shots).filter((k) => k.endsWith('-err')) }));
  await ctx.close(); await browser.close();
}
