// Fable pass-43 screenshot matrix: what changed since pass 42 — the model page of a launch-day row whose only offer the
// confidentiality default hides (D257: claude-sonnet-5.5, claude-mythos-5.1, claude-mythos-5), the VulcanBench board after the
// D256.1 registry repair (D258), the hidden AudioJevBench v0.1 preview (CR-175, PR #41), and the quick views on today's data.
// The JevBench hub after F-223/F-224/F-225 is shot by shoot-fable-pass42.mjs into the same out dir.
// Usage: node shoot-fable-pass43.mjs <base> <out>   (ONLY=<step prefix>, CTX=<kind_theme>)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260929-pass43/canonical';
await fs.mkdir(OUT, { recursive: true });
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const HIDDEN_OFFER = ['claude-sonnet-5.5::default', 'claude-mythos-5.1::default'];
const VULCAN = 'vulcanbench-frontier::4';
const AUDIO = '/wip-33gyqg9xwm5y/audio-jev';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : null;
const vis = (el) => el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub, .sr-only')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };`;
const pageGeom = new Function(`${bxFn}
  const main = document.querySelector('main') || document.body;
  const heads = [...main.querySelectorAll('h1, h2, h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 90), y: bx(h).y }));
  const tables = [...main.querySelectorAll('table')].filter(vis).map((t) => ({ rows: t.querySelectorAll('tbody tr').length, cols: t.querySelectorAll('thead th').length, ...bx(t), wrapCw: t.parentElement.clientWidth, wrapSw: t.parentElement.scrollWidth, ths: [...t.querySelectorAll('thead th')].map((x) => txt(x).slice(0, 18)).join('|').slice(0, 260) }));
  const overflow = [...main.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, cls: String(e.className).slice(0, 60), sw: e.scrollWidth, cw: e.clientWidth, y: bx(e).y })).slice(0, 12);
  const details = [...main.querySelectorAll('details')].map((d) => ({ s: txt(d.querySelector('summary')).slice(0, 80), open: d.open, y: bx(d).y }));
  const firstScreen = [...main.querySelectorAll('h1, h2, h3, p, summary, li, button')].filter((e) => vis(e) && e.getBoundingClientRect().top + scrollY < innerHeight).map((e) => e.tagName + ' ' + txt(e).slice(0, 140));
  const allText = txt(main);
  const nan = (allText.match(/NaN|undefined|null%|\\bInfinity\\b/g) || []).length;
  const one = (allText.match(/(?<![\\d.,])\\b1 (systems|decisions|models|rows|entries|offers|providers|benchmarks)\\b/g) || []).slice(0, 3);
  const fields = [...main.querySelectorAll('p, li, td, th, h1, h2, h3, summary, dt, dd, span')].filter((e) => vis(e) && !e.closest('code')).map((e) => txt(e)).filter((t) => t && t.length < 300).flatMap((t) => t.match(/\\b[a-z]+_[a-z_]+\\b/g) || []).slice(0, 8);
  const svgs = [...main.querySelectorAll('svg')].filter((s) => vis(s) && s.getBoundingClientRect().width > 60).length;
  return { title: document.title, url: location.pathname + location.search, robots: document.querySelector('meta[name=robots]')?.content ?? null, heads, tables, overflow, details, firstScreen, nan, one, fields, svgs, words: allText.split(' ').length, minFont: minFont(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
// D257: what the model page says about its offers — the header count, the Providers card, the folded route list.
const offersProbe = new Function(`${bxFn}
  const main = document.querySelector('main') || document.body;
  const h1 = main.querySelector('h1'); const sub = h1 ? (h1.closest('div')?.parentElement?.querySelector('p') || h1.parentElement?.nextElementSibling) : null;
  const header = [...main.querySelectorAll('p')].map((p) => txt(p)).find((t) => /\\b\\d+ offers?\\b/.test(t) && t.length < 160) || null;
  const card = [...main.querySelectorAll('section.card')].find((s) => /providers/i.test(txt(s.querySelector('h2')) || ''));
  const all = main.querySelector('#all-offers');
  const hidden = main.querySelector('[data-bh-hidden-offers]');
  const sheet = [...main.querySelectorAll('p')].map((p) => txt(p)).find((t) => /registered benchmark versions/.test(t)) || null;
  const missing = [...main.querySelectorAll('summary')].map((s) => txt(s)).find((t) => /Missing coverage/.test(t)) || null;
  return { h1: txt(h1), header, card: card ? { ...bx(card), t: txt(card).slice(0, 500), rows: card.querySelectorAll('tbody tr').length, buttons: [...card.querySelectorAll('button')].map((b) => ({ t: txt(b), ...bx(b) })) } : null,
    allOffers: all ? { summary: txt(all.querySelector('summary')), open: all.open } : null,
    hidden: hidden ? { n: hidden.getAttribute('data-bh-hidden-offers'), why: hidden.getAttribute('data-bh-hidden-why'), t: txt(hidden).slice(0, 400), ...bx(hidden) } : null, sheet, missing };
`);
const rankProbe = new Function(`${bxFn}
  const main = document.querySelector('main') || document.body;
  const rows = [...main.querySelectorAll('table tbody tr')].slice(0, 40).map((r) => txt(r).slice(0, 160));
  const notes = [...main.querySelectorAll('p, li, figcaption, small')].filter(vis).map((e) => txt(e)).filter((t) => t && /timeout|timed out|full[- ]suite|unfinished|combined|denominator|passed of|differs|lower than/i.test(t)).slice(0, 8).map((t) => t.slice(0, 300));
  const titled = [...main.querySelectorAll('[title]')].map((e) => e.getAttribute('title')).filter((t) => /timeout|full[- ]suite|combined/i.test(t || '')).slice(0, 6);
  return { h1: txt(main.querySelector('h1')), rows, notes, titled };
`);
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const tag = `${kind}_${theme}`;
  if (process.env.CTX && process.env.CTX !== tag) continue;
  const metrics = { base: BASE, at: new Date().toISOString(), ctx: tag, shots: {}, errors: [] };
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); p.setDefaultTimeout(15000);
  p.on('pageerror', (e) => metrics.errors.push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors.push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); };
  const fullOnce = async (name) => { if (theme === 'light') await rec(name + '-full', true); };
  const vpAt = async (name, loc, dy = -8) => { try { await loc.first().evaluate((el, d) => { window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d); }, dy); await p.waitForTimeout(500); await rec(name); } catch (e) { metrics.shots[`${name}-vp-err`] = String(e).slice(0, 300); } };
  const step = async (name, fn) => { if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return; try { await fn(); } catch (e) { metrics.shots[`${name}-err`] = String(e).slice(0, 300); } };

  for (const id of HIDDEN_OFFER) await step(`offers-${id.split('::')[0]}`, async () => {
    const name = `offers-${id.split('::')[0]}`;
    await go(`/models/${encodeURIComponent(id)}`); await rec(name);
    metrics.shots[`${name}-geom`] = await p.evaluate(pageGeom); metrics.shots[`${name}-probe`] = await p.evaluate(offersProbe);
    await fullOnce(name);
    // The remedy, as a reader would take it: the card's own button, then the same probe again.
    const btn = p.locator('[data-bh-hidden-offers] button').first();
    if (await btn.count()) { await btn.click(); await p.waitForTimeout(900); metrics.shots[`${name}-after-probe`] = await p.evaluate(offersProbe); await p.evaluate(() => scrollTo(0, 0)); await rec(`${name}-after`); }
  });
  await step('vulcan', async () => {
    await go(`/benchmarks?benchmark=${encodeURIComponent(VULCAN)}`); await rec('vulcan');
    metrics.shots['vulcan-geom'] = await p.evaluate(pageGeom); metrics.shots['vulcan-probe'] = await p.evaluate(rankProbe);
    await fullOnce('vulcan'); await vpAt('vulcan-table', p.locator('main table').first(), -140);
  });
  await step('audio', async () => {
    await go(AUDIO); await rec('audio'); metrics.shots['audio-geom'] = await p.evaluate(pageGeom); await fullOnce('audio');
    await vpAt('audio-capability', p.locator('[data-bh-audiojev-capability], main svg').first(), -60);
    await vpAt('audio-full', p.locator('[data-bh-audiojev-group="full"]'), -20);
    await vpAt('audio-public', p.locator('[data-bh-audiojev-group="public-only"]'), -20);
    await vpAt('audio-robustness', p.locator('[data-bh-audiojev-robustness]'), -20);
    await vpAt('audio-examples', p.locator('[data-bh-audiojev-examples]'), -20);
  });
  await step('simple', async () => { await go('/'); await rec('simple'); metrics.shots['simple-geom'] = await p.evaluate(pageGeom); await fullOnce('simple'); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await settle(); await rec('advanced'); metrics.shots['advanced-geom'] = await p.evaluate(pageGeom); await vpAt('advanced-table', p.locator('main table').first(), -120); });
  await step('wizard', async () => { await go('/'); const t = p.getByRole('tab', { name: /wizard|assistant|guided/i }); if (await t.count()) { await t.first().click(); await p.waitForTimeout(1200); } else { await go('/wizard'); } await rec('wizard'); metrics.shots['wizard-geom'] = await p.evaluate(pageGeom); });
  await step('bmx', async () => { await go('/benchmaxxing'); await rec('bmx'); metrics.shots['bmx-geom'] = await p.evaluate(pageGeom); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); metrics.shots['model-geom'] = await p.evaluate(pageGeom); metrics.shots['model-probe'] = await p.evaluate(offersProbe); await fullOnce('model'); });
  await step('bench', async () => { await go('/benchmarks'); await rec('bench'); metrics.shots['bench-geom'] = await p.evaluate(pageGeom); });
  await fs.writeFile(`${OUT}/metrics-p43${process.env.ONLY ? '-' + process.env.ONLY : ''}-${tag}.json`, JSON.stringify(metrics, null, 1));
  console.log(tag, JSON.stringify({ errors: metrics.errors.length, errs: Object.keys(metrics.shots).filter((k) => k.endsWith('-err')), pages: Object.entries(metrics.shots).filter(([k]) => k.endsWith('-geom')).map(([k, v]) => `${k.replace('-geom', '')}: h${v.body.h} sw${v.body.sw}/${v.body.cw} min${v.minFont.px} nan${v.nan} ovf${v.overflow.length}`) }));
  await c.close(); await b.close();
}
