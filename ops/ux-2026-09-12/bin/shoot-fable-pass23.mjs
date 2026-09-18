// Fable pass-23 screenshot matrix: what changed since pass 22 — iterations 102–107. CR-65.14 (Retired caveat tag on
// /benchmarks, read-date line), CR-60.2 + F-121 (‡ preliminary chart-read values on /benchmarks, /compare and the
// Simple Benchmarks section; the Compare caption; the evidence-panel sentence), plus the standard quick views
// (Simple, Advanced, Guided, Benchmaxxing, model page). 1440/390 × light/dark. Footnote geometry is measured because
// the pass-20 rule caps a visible footnote at two sentences.
// Usage: node shoot-fable-pass23.mjs <base> <out> [changed-only]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260918-pass23';
const CHANGED_ONLY = process.argv[4] === 'changed-only';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const RETIRED_SEL = 'claude-fable-5::max,gpt-5.2::xhigh'; // verify-cr-65-14's pair: every judged row exists
const PRELIM_SEL = 'claude-fable-5.1::high,gpt-6-astra::default,union-alpha::default'; // CR-60.2: Union Alpha's ‡ rows
const txt = (s) => s.replace(/\s+/g, ' ').trim();
// Footnote geometry: words, sentences, rendered height and line count of every small muted paragraph in <main>.
const footnotes = () => [...document.querySelectorAll('main p.bh-muted.text-xs, main p.text-xs')].map((p) => { const r = p.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(p).lineHeight) || 16; const t = p.innerText.replace(/\s+/g, ' ').trim(); return { words: t.split(' ').length, sentences: (t.match(/[.!?](\s|$)/g) || []).length, h: Math.round(r.height), lines: Math.round(r.height / lh), w: Math.round(r.width), head: t.slice(0, 70) }; }).filter((f) => f.words > 12);
const marks = () => { const sups = [...document.querySelectorAll('main sup')]; return { n: sups.length, prelim: sups.filter((s) => s.textContent.includes('‡')).length, self: sups.filter((s) => s.textContent.includes('†')).length, first: sups.slice(0, 3).map((s) => ({ t: s.textContent.slice(0, 40), title: s.getAttribute('title')?.slice(0, 120), cell: s.closest('td, th')?.innerText.replace(/\s+/g, ' ').slice(0, 60), fs: getComputedStyle(s).fontSize })) }; };
const tags = () => [...document.querySelectorAll('main .bh-matrix-tag')].reduce((acc, t) => { const k = t.getAttribute('data-tag') || t.innerText.trim(); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
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

  // ---- /benchmarks default: header, tags, footnote geometry ----
  await step('benchmarks', async () => {
    await go('/benchmarks'); await rec('benchmarks'); await rec('benchmarks-full', true);
    metrics.shots[`${tag}-bm-footnotes`] = await p.evaluate(footnotes);
    metrics.shots[`${tag}-bm-tags`] = await p.evaluate(tags);
    metrics.shots[`${tag}-bm-marks`] = await p.evaluate(marks);
    metrics.shots[`${tag}-bm-status`] = await p.evaluate(() => [...document.querySelectorAll('main p, main div')].map((x) => x.innerText?.replace(/\s+/g, ' ').trim()).filter((t) => t && /benchmarks across|categories/i.test(t) && t.length < 200).slice(0, 2));
    const foot = p.locator('main p.bh-muted.text-xs').last(); if (await foot.count()) await recEl('benchmarks-footnote', foot);
  });
  // ---- /benchmarks with the retired pair, all rows: the Retired tag ----
  await step('benchmarks-retired', async () => {
    await go(`/benchmarks?rows=all&models=${encodeURIComponent(RETIRED_SEL)}`);
    metrics.shots[`${tag}-bm-retired-tags`] = await p.evaluate(tags);
    const rt = p.locator('main .bh-matrix-tag[data-tag="retired"]').first();
    if (await rt.count()) {
      const row = rt.locator('xpath=ancestor::tr[1]');
      await recEl('benchmarks-retired-row', row);
      metrics.shots[`${tag}-bm-retired-row`] = await row.evaluate((tr) => ({ text: tr.innerText.replace(/\s+/g, ' ').slice(0, 260), h: Math.round(tr.getBoundingClientRect().height), tagTitle: tr.querySelector('[data-tag="retired"]')?.getAttribute('title')?.slice(0, 200), tagOrder: [...tr.querySelectorAll('.bh-matrix-tag')].map((t) => t.getAttribute('data-tag')) }));
      // hover the tag on desktop to see what a reader gets
      if (!mobile) { await rt.hover(); await p.waitForTimeout(900); await rec('benchmarks-retired-hover'); }
      else { await rt.tap().catch(() => {}); await p.waitForTimeout(700); await rec('benchmarks-retired-tap'); metrics.shots[`${tag}-bm-retired-tap-popover`] = await p.evaluate(() => (document.querySelector('[role=tooltip], [role=dialog]')?.innerText || '').replace(/\s+/g, ' ').slice(0, 300)); }
    }
    // the version / read-date line under a benchmark name
    metrics.shots[`${tag}-bm-versionlines`] = await p.evaluate(() => [...document.querySelectorAll('main table tbody th')].slice(0, 40).map((th) => th.innerText.replace(/\s+/g, ' ').trim()).filter((t) => /read |published|pinned|snapshot/i.test(t)).slice(0, 6));
  });
  // ---- /benchmarks with Union Alpha: the ‡ mark ----
  await step('benchmarks-prelim', async () => {
    await go(`/benchmarks?rows=all&models=${encodeURIComponent(PRELIM_SEL)}`);
    metrics.shots[`${tag}-bm-prelim-marks`] = await p.evaluate(marks);
    metrics.shots[`${tag}-bm-prelim-head`] = await p.evaluate(() => [...document.querySelectorAll('main table thead th')].map((th) => th.innerText.replace(/\s+/g, ' ').trim().slice(0, 60)));
    const sup = p.locator('main table sup').filter({ hasText: '‡' }).first();
    if (await sup.count()) {
      const row = sup.locator('xpath=ancestor::tr[1]'); await recEl('benchmarks-prelim-row', row);
      metrics.shots[`${tag}-bm-prelim-row`] = await row.evaluate((tr) => ({ text: tr.innerText.replace(/\s+/g, ' ').slice(0, 260), bars: [...tr.querySelectorAll('.bh-matrix-bar')].map((b) => b.style.width), bold: [...tr.querySelectorAll('td .font-bold')].map((x) => x.innerText.trim()) }));
      if (!mobile) { await sup.hover(); await p.waitForTimeout(900); await rec('benchmarks-prelim-hover'); }
      else { await sup.tap().catch(() => {}); await p.waitForTimeout(700); await rec('benchmarks-prelim-tap'); }
      // open the cell → detail page: the evidence sentence
      const link = sup.locator('xpath=ancestor::a[1]'); if (await link.count()) { await link.click(); await settle(); await rec('benchmarks-prelim-detail'); metrics.shots[`${tag}-bm-prelim-detail`] = await p.evaluate(() => ({ url: location.pathname + location.search, chartRead: [...document.querySelectorAll('main *')].filter((e) => e.children.length === 0 && /chart-read/i.test(e.textContent)).map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 200)).slice(0, 3) })); }
    }
  });
  // ---- /compare with Union Alpha: ‡ + caption ----
  await step('compare-prelim', async () => {
    await go(`/compare?model=${encodeURIComponent(FRONTIER)}&model=${encodeURIComponent('union-alpha::default')}`); await p.waitForTimeout(1500);
    await rec('compare-prelim'); await rec('compare-prelim-full', true);
    metrics.shots[`${tag}-cmp-marks`] = await p.evaluate(marks);
    metrics.shots[`${tag}-cmp-footnotes`] = await p.evaluate(() => [...document.querySelectorAll('#full-comparison p')].map((x) => { const t = x.innerText.replace(/\s+/g, ' ').trim(); return { words: t.split(' ').length, sentences: (t.match(/[.!?](\s|$)/g) || []).length, h: Math.round(x.getBoundingClientRect().height), head: t.slice(0, 70) }; }));
    const sec = p.locator('#full-comparison').first(); if (await sec.count()) await recEl('compare-full-table', sec);
    const sup = p.locator('#full-comparison sup').filter({ hasText: '‡' }).first(); if (await sup.count()) { const row = sup.locator('xpath=ancestor::tr[1]'); await recEl('compare-prelim-row', row); metrics.shots[`${tag}-cmp-prelim-row`] = await row.evaluate((tr) => ({ text: tr.innerText.replace(/\s+/g, ' ').slice(0, 260), tinted: [...tr.querySelectorAll('td')].map((td) => td.className.includes('bg-accent2')), bars: [...tr.querySelectorAll('td span[style]')].map((s) => s.style.width) })); }
  });
  // ---- Simple home: Benchmarks section + footnote ----
  await step('simple', async () => {
    await go('/'); await rec('simple'); if (!CHANGED_ONLY) await rec('simple-full', true);
    metrics.shots[`${tag}-simple-footnotes`] = await p.evaluate(footnotes);
    const h = p.locator('main h2').filter({ hasText: /benchmark/i }).first();
    if (await h.count()) { const sec = h.locator('xpath=ancestor::section[1]'); if (await sec.count()) { await recEl('simple-benchmarks', sec); metrics.shots[`${tag}-simple-bm-tags`] = await sec.evaluate((s) => [...s.querySelectorAll('.bh-matrix-tag')].reduce((a, t) => { const k = t.getAttribute('data-tag'); a[k] = (a[k] || 0) + 1; return a; }, {})); const foot = sec.locator('p.bh-muted.text-xs').last(); if (await foot.count()) await recEl('simple-benchmarks-footnote', foot); } }
  });
  if (CHANGED_ONLY) { await c.close(); continue; }
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); await rec('model-full', true); metrics.shots[`${tag}-model-footnotes`] = await p.evaluate(footnotes); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 1800)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
