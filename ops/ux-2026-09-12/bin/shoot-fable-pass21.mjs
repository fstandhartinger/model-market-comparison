// Fable pass-21 screenshot matrix: what changed since pass 20 — iterations 90–95. F-107 Compare radar percentile
// convention + Scale control, F-108 Benchmaxxing radar (zero ring, ring labels, average ring, one Other arc), F-109 Overview
// legend disclosure, F-110 Benchmarks group header at 390, CR-65.4 "Insufficient evidence" band, CR-65.6/65.7 tag turnover
// (frontier models now tagged), CR-65.15 D9 "Changed at source" notes, CR-67.7 privacy visitor-statistics section,
// CR-56.4 "For agents" section, Guided unchanged. 1440/390 × light/dark.
// Usage: node shoot-fable-pass21.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260917-pass21';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, text: document.body.innerText.slice(0, 120) }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const STRONG_FALLBACK = 'qwen3.6-plus::default', FRONTIER = 'claude-fable-5.1::high', WIDE = 'minimax-m2.7::default';
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
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };
  const radarGeom = (el) => { const s = el.querySelector('svg'); if (!s) return null; const sb = s.getBoundingClientRect(); const wrap = (s.closest('[data-radar-wrap]') || s.parentElement).getBoundingClientRect(); const spans = [...s.parentElement.querySelectorAll('span, text')].map((t) => { const r = t.getBoundingClientRect(); return { t: t.textContent.trim().slice(0, 28), l: Math.round(r.left), r: Math.round(r.right), outside: r.left < wrap.left - 1 || r.right > wrap.right + 1 }; }).filter((x) => x.t); return { svg: [Math.round(sb.width), Math.round(sb.height)], wrap: [Math.round(wrap.left), Math.round(wrap.right)], n: spans.length, outside: spans.filter((x) => x.outside).map((x) => `${x.t} l${x.l} r${x.r}`), rings: spans.filter((x) => /^(0|50|100|percentile|p\d+|avg p\d+|[AB] avg p\d+)$/.test(x.t)).map((x) => x.t), circles: s.querySelectorAll('circle').length, dashed: [...s.querySelectorAll('circle')].filter((c) => c.getAttribute('stroke-dasharray')).length }; };

  // ---- Overview Simple: table with the new tags, footnote + legend (F-109), value map ----
  await step('simple', async () => {
    await go('/'); await rec('simple'); await rec('simple-full', true);
    metrics.shots[`${tag}-simple-tags`] = await p.evaluate(() => [...document.querySelectorAll('table a[href*="benchmaxxing"], table [data-bh-tag]')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 20));
    const leg = p.locator('[data-bh-legend]').first();
    if (await leg.count()) { const foot = leg.locator('xpath=..'); await recEl('simple-footnote', foot); metrics.shots[`${tag}-footnote-text`] = (await foot.innerText()).slice(0, 600); await leg.locator('summary').click(); await p.waitForTimeout(400); await recEl('simple-legend-open', foot); metrics.shots[`${tag}-legend-text`] = (await leg.innerText()).replace(/\s+/g, ' ').slice(0, 900); }
  });
  // ---- Advanced: the Insufficient-evidence band (CR-65.4) ----
  await step('advanced', async () => {
    await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced');
    const band = p.locator('tr, caption, div').filter({ hasText: /^Insufficient evidence/i }).first();
    if (await band.count()) { await band.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await rec('advanced-band'); metrics.shots[`${tag}-band-text`] = (await band.innerText()).replace(/\s+/g, ' ').slice(0, 300); const rows = band.locator('xpath=following-sibling::tr[position()<=3]'); metrics.shots[`${tag}-band-rows`] = await rows.allInnerTexts().then((a) => a.map((t) => t.replace(/\s+/g, ' ').slice(0, 160))); }
    metrics.shots[`${tag}-advanced-tags`] = await p.evaluate(() => [...document.querySelectorAll('table a[href*="benchmaxxing"]')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30));
  });

  // ---- Benchmaxxing: table with the new tag set, report radars (F-108) ----
  await step('benchmaxxing', async () => {
    await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); await rec('benchmaxxing-full', true);
    metrics.shots[`${tag}-bmx-intro`] = await p.evaluate(() => ({ intro: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 900), rows: [...document.querySelectorAll('table tbody tr')].slice(0, 12).map((r) => r.innerText.replace(/\s+/g, ' ').slice(0, 140)) }));
    const strong = p.locator('a[href*="model="]').filter({ hasText: /strong|⚠/ }).first();
    const anyRow = p.locator('table a[href*="/benchmaxxing?model="], table a[href*="#radar"]').first();
    const target = (await strong.count()) ? strong : anyRow;
    if (await target.count()) { const href = await target.getAttribute('href'); metrics.shots[`${tag}-bmx-report-href`] = href; await target.click(); await p.waitForTimeout(1500); await settle(); await rec('bmx-report'); await rec('bmx-report-full', true); }
    const radar = p.locator('#radar').first();
    if (await radar.count()) { await recEl('bmx-radar', radar); metrics.shots[`${tag}-bmx-radar-geom`] = await radar.evaluate(radarGeom); metrics.shots[`${tag}-bmx-radar-copy`] = await radar.evaluate((el) => [...el.querySelectorAll('p, figcaption, [data-jagged-note]')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6)); }
  });
  for (const [name, id] of [['frontier', FRONTIER], ['wide', WIDE], ['strong', STRONG_FALLBACK]]) await step(`bmx-${name}`, async () => {
    await go(`/benchmaxxing?model=${encodeURIComponent(id)}#radar`); await p.waitForTimeout(1500);
    const radar = p.locator('#radar').first(); if (await radar.count()) { await recEl(`bmx-radar-${name}`, radar); metrics.shots[`${tag}-bmx-radar-${name}-geom`] = await radar.evaluate(radarGeom); }
    if (name === 'frontier') await rec('bmx-report-frontier');
  });

  // ---- Compare: radar with the Scale control (F-107) ----
  await step('compare', async () => {
    await go('/compare'); await p.waitForTimeout(1800); await rec('compare');
    const radar = p.locator('svg').filter({ has: p.locator('polygon') }).first();
    if (await radar.count()) {
      const fig = radar.locator('xpath=ancestor::*[self::figure or self::section][1]');
      await recEl('compare-radar', fig); metrics.shots[`${tag}-compare-radar-text`] = (await fig.innerText()).replace(/\s+/g, ' ').slice(0, 700);
      metrics.shots[`${tag}-compare-scale`] = await p.evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].map((b) => `${b.innerText.trim()}${b.getAttribute('aria-pressed') === 'true' ? '*' : ''}`).slice(0, 12));
      const native = p.getByRole('button', { name: /^Native$/ }).first(); if (await native.count()) { await native.click(); await p.waitForTimeout(800); await recEl('compare-radar-native', fig); }
      const pct = p.getByRole('button', { name: /^Percentile$/ }).first(); if (await pct.count()) { await pct.click(); await p.waitForTimeout(500); }
      const detailed = p.getByRole('button', { name: /^Detailed$/ }).first(); if (await detailed.count()) { await detailed.click(); await p.waitForTimeout(1200); await recEl('compare-radar-detailed', fig); metrics.shots[`${tag}-compare-detailed-geom`] = await fig.evaluate(radarGeom); }
      const exact = p.locator('summary').filter({ hasText: /exact radar values/i }).first(); if (await exact.count()) { await exact.click(); await p.waitForTimeout(500); await recEl('compare-exact', exact.locator('xpath=..')); }
    }
  });

  // ---- Benchmarks: group header (F-110), D9 notes ----
  await step('benchmarks', async () => {
    await go('/benchmarks'); await p.waitForTimeout(1500); await rec('benchmarks');
    const grp = p.locator('tr.bh-matrix-group').first(); if (await grp.count()) { await recEl('benchmarks-group', grp); metrics.shots[`${tag}-bm-group`] = (await grp.innerText()).replace(/\s+/g, ' ').slice(0, 200); }
    const note = p.locator('text=/Changed at source/i').first(); if (await note.count()) { await note.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await rec('benchmarks-d9'); metrics.shots[`${tag}-d9-text`] = await note.evaluate((el) => (el.closest('td, th, tr, p, div')?.innerText || '').replace(/\s+/g, ' ').slice(0, 300)); }
    metrics.shots[`${tag}-bm-d9-count`] = await p.evaluate(() => (document.body.innerText.match(/Changed at source/gi) || []).length);
    await rec('benchmarks-table');
  });

  // ---- Model page ----
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); await rec('model-full', true); metrics.shots[`${tag}-model-bmx`] = await p.evaluate(() => [...document.querySelectorAll('a[href*="benchmaxxing"]')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6)); });

  // ---- Privacy (CR-67.7), About#agents (CR-56.4) ----
  await step('privacy', async () => { await go('/privacy'); await rec('privacy'); await rec('privacy-full', true); const sec = p.locator('#visitor-statistics'); if (await sec.count()) { await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await rec('privacy-visitors'); metrics.shots[`${tag}-privacy-text`] = await sec.evaluate((h) => { let t = h.innerText + '\n'; let e = h.nextElementSibling; while (e && e.tagName !== 'H2') { t += e.innerText + '\n'; e = e.nextElementSibling; } return t.slice(0, 2500); }); } });
  await step('agents', async () => { await go('/about#agents'); await p.waitForTimeout(800); const sec = p.locator('#agents'); if (await sec.count()) { await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await rec('about-agents'); metrics.shots[`${tag}-agents-text`] = await sec.evaluate((h) => { let t = h.innerText + '\n'; let e = h.nextElementSibling; while (e && e.tagName !== 'H2') { t += e.innerText + '\n'; e = e.nextElementSibling; } return t.slice(0, 2500); }); } });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.text != null ? `${v.w}x${v.h}` : JSON.stringify(v).slice(0, 1500)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
