// Fable pass-19 screenshot matrix: what changed since pass 18 — iteration 83 (CR-40 shortlist chart: diagonal names,
// zoomed axis, cogwheel; CR-41 best-of rows; CR-42.1 two-level value tags; CR-46.1 tags back; CR-45.1 preview copy),
// plus Florian's CR-20260916i (strong tag looks weaker than weak) and the standing Simple/Guided/Advanced/Benchmaxxing/
// model-page sweep. Usage: node shoot-fable-pass19.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260916-pass19';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, text: document.body.innerText.slice(0, 160) }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const settle = async () => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1200); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const recEl = async (name, loc) => { try { await loc.first().screenshot({ path: `${OUT}/${tag}-${name}.png` }); metrics.shots[`${tag}-${name}`] = 'element'; } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), sh: el.scrollHeight, vw: innerWidth, vh: innerHeight }; }).catch(() => null);

  // ---- Simple: value tags (CR-42.1 / CR-46.1 / CR-47.1) ----
  await step('simple', async () => {
    await go('/'); await rec('simple'); await rec('simple-full', true);
    const tbl = p.locator('table').filter({ has: p.locator('tr.bh-ranking-row') }).first();
    if (await tbl.count()) {
      await tbl.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await recEl('simple-table', tbl);
      metrics.shots[`${tag}-tags`] = await p.evaluate(() => [...document.querySelectorAll('.bh-value-tag')].map((t) => { const cs = getComputedStyle(t); const r = t.getBoundingClientRect(); const row = t.closest('tr'); return { model: row?.querySelector('th, td')?.innerText.replace(/\s+/g, ' ').slice(0, 40), kind: t.dataset.kind, level: t.dataset.level, text: t.innerText.replace(/\s+/g, ' '), color: cs.color, bg: cs.backgroundColor, shadow: cs.boxShadow, weight: cs.fontWeight, size: cs.fontSize, w: Math.round(r.width), h: Math.round(r.height) }; }));
      // crop: the first strong and the first weak tag rows, plus a pair of rows around them
      for (const level of ['strong', 'weak']) {
        const t = p.locator(`.bh-value-tag[data-level="${level}"]`).first();
        if (await t.count()) { const row = t.locator('xpath=ancestor::tr[1]'); await row.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await recEl(`simple-tag-${level}-row`, row); }
      }
      // a crop of the cost column across the top 12 rows (both levels side by side)
      const rows = p.locator('tr.bh-ranking-row'); const n = Math.min(await rows.count(), 12);
      if (n > 1) { const first = await box(rows.nth(0)); const last = await box(rows.nth(n - 1)); if (first && last) { await rows.nth(0).scrollIntoViewIfNeeded(); await p.waitForTimeout(200); const f = await box(rows.nth(0)); const l = await box(rows.nth(n - 1)); const clip = { x: Math.max(0, f.l), y: Math.max(0, f.t), width: Math.min(f.w, vp.width - Math.max(0, f.l)), height: Math.min(l.t + l.h - f.t, vp.height - Math.max(0, f.t)) }; if (clip.height > 20) { await p.screenshot({ path: `${OUT}/${tag}-simple-top12.png`, clip }); metrics.shots[`${tag}-simple-top12`] = clip; } } }
    }
    // shortlist chart (CR-40)
    const fig = p.locator('[data-shortlist-columns]').first();
    if (await fig.count()) {
      await fig.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await recEl('shortlist-chart', fig); metrics.shots[`${tag}-shortlist-geom`] = await fig.evaluate((el) => { const names = [...el.querySelectorAll('[data-name-for]')].map((a) => { const r = a.getBoundingClientRect(); return { t: a.innerText, transform: getComputedStyle(a).transform, l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom) }; }); const box = el.getBoundingClientRect(); return { w: Math.round(box.width), h: Math.round(box.height), range: el.querySelector('[data-axis-range]')?.innerText, ticks: [...el.querySelectorAll('[data-axis-tick]')].map((t) => t.dataset.axisTick), rows: !!el.querySelector('[data-axis-ticks]'), names, cut: names.filter((x) => x.l < box.left || x.r > box.right || x.b > box.bottom).length, caption: el.querySelector('figcaption')?.innerText.replace(/\s+/g, ' ') }; });
      const cog = fig.locator('[data-shortlist-settings]').first(); if (await cog.count()) { await cog.click(); await p.waitForTimeout(400); await recEl('shortlist-settings', fig); const cb = fig.locator('input[data-pref="zeroBaseline"]'); if (await cb.count() && !(await cb.isDisabled())) { await cb.check(); await p.waitForTimeout(500); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await recEl('shortlist-chart-zero', fig); metrics.shots[`${tag}-shortlist-zero`] = await fig.evaluate((el) => ({ range: el.querySelector('[data-axis-range]')?.innerText, ticks: [...el.querySelectorAll('[data-axis-tick]')].map((t) => t.dataset.axisTick) })); await p.evaluate(() => localStorage.removeItem('bh.shortlistChart.v1')); } }
    }
    // section 2 with best-of rows (CR-41)
    const s2 = p.locator('#benchmarks').first(); if (await s2.count()) { await s2.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800); await rec('simple-section2'); const bo = s2.locator('tr[data-best-of]').first(); if (await bo.count()) { await bo.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('simple-bestof'); await recEl('simple-bestof-row', bo); metrics.shots[`${tag}-bestof`] = await s2.evaluate((el) => [...el.querySelectorAll('tr[data-best-of]')].map((r) => ({ name: r.querySelector('th, td')?.innerText.replace(/\s+/g, ' ').slice(0, 220), h: Math.round(r.getBoundingClientRect().height), variants: [...r.querySelectorAll('[data-variant]')].map((a) => a.dataset.variant) }))); } }
  });

  // ---- Benchmarks page best-of rows ----
  await step('benchmarks', async () => {
    await go('/benchmarks'); await p.waitForTimeout(1500); await rec('benchmarks');
    const bo = p.locator('tr[data-best-of]').first(); if (await bo.count()) { await bo.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('benchmarks-bestof'); await recEl('benchmarks-bestof-row', bo); metrics.shots[`${tag}-bm-bestof`] = await p.evaluate(() => [...document.querySelectorAll('tr[data-best-of]')].map((r) => ({ name: r.querySelector('th, td')?.innerText.replace(/\s+/g, ' ').slice(0, 220), h: Math.round(r.getBoundingClientRect().height), sub: r.querySelector('[data-best-of-note]')?.innerText }))); const link = bo.locator('a.bh-matrix-link').first(); if (await link.count()) { await link.click(); await p.waitForLoadState('domcontentloaded'); await settle(); await rec('benchmarks-bestof-result'); metrics.shots[`${tag}-bestof-result`] = await p.evaluate(() => ({ h1: document.querySelector('h1')?.innerText, text: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 900) })); } }
  });

  // ---- standing sweep ----
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); await rec('guided-full', true); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1200); await rec('advanced'); await rec('advanced-full', true); metrics.shots[`${tag}-adv-tags`] = await p.evaluate(() => [...document.querySelectorAll('.bh-value-tag')].map((t) => `${t.dataset.kind}/${t.dataset.level} ${t.innerText.replace(/\s+/g, ' ')}`)); const bx = p.locator('.bh-signal-pill, .bh-badge.bh-alert').first(); if (await bx.count()) { await bx.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('advanced-benchmaxxing-tag'); metrics.shots[`${tag}-bmx-tag`] = await bx.evaluate((e) => ({ tag: e.tagName, text: e.innerText, role: e.getAttribute('role'), href: e.closest('a')?.href })); } });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1500); await rec('benchmaxxing'); await rec('benchmaxxing-full', true); });
  await step('model', async () => { await go('/models/claude-fable-5.1%3A%3Ahigh'); await rec('model'); await rec('model-full', true); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.text != null ? `${v.w}x${v.h}` : JSON.stringify(v).slice(0, 1500)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
