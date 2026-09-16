// Fable pass-20 screenshot matrix: what changed since pass 19 — iterations 86–89 (CR-63 pre-release UI gauntlet: nav
// order + Overview teaser, Benchmaxxing first-5-seconds + table polish, model-page formats + Benchmaxxing line, /eu,
// Benchmarks data bars + chips, Compare accent colours, phone value-map labels, 404; CR-64 capability-only Benchmaxxing),
// plus the two radar rows of the data & math gauntlet (CR-65.17 Compare radar scales, CR-65.18 Benchmaxxing radar story).
// Usage: node shoot-fable-pass20.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260916-pass20';
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

  // ---- Overview: nav order, teaser under the table, footnote ----
  await step('simple', async () => {
    await go('/'); await rec('simple'); await rec('simple-full', true);
    metrics.shots[`${tag}-nav`] = await p.evaluate(() => [...document.querySelectorAll('header nav a, header a, header summary, header button')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30));
    const teaser = p.locator('a[href*="/benchmaxxing"]').filter({ hasText: /flagged|Benchmaxxing check/i }).first();
    if (await teaser.count()) { const card = teaser.locator('xpath=ancestor::*[self::p or self::div or self::section or self::aside][1]'); await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('simple-teaser'); await recEl('simple-teaser-card', card); metrics.shots[`${tag}-teaser-text`] = await card.innerText(); }
    const foot = p.locator('text=/Striped score/').first(); if (await foot.count()) { await foot.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('simple-footnote'); metrics.shots[`${tag}-footnote`] = (await foot.locator('xpath=ancestor::*[self::p or self::div][1]').innerText()).slice(0, 900); }
    const vm = p.locator('[data-value-map], figure').filter({ hasText: /quadrant|Most attractive/i }).first(); if (await vm.count()) { await vm.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await recEl('simple-valuemap', vm); }
  });
  if (mobile) await step('more-menu', async () => { await go('/'); const more = p.locator('header').getByText(/^More/).first(); if (await more.count()) { await more.click(); await p.waitForTimeout(500); await rec('more-menu'); metrics.shots[`${tag}-more-items`] = await p.evaluate(() => [...document.querySelectorAll('header details[open] a, header [role="menu"] a, header nav a')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)); } });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1200); await rec('advanced'); await rec('advanced-full', true); });

  // ---- Benchmaxxing page: default tab, intro, table, radar ----
  await step('benchmaxxing', async () => {
    await go('/benchmaxxing'); await p.waitForTimeout(1500); await rec('benchmaxxing'); await rec('benchmaxxing-full', true);
    metrics.shots[`${tag}-bmx-intro`] = await p.evaluate(() => ({ h1: document.querySelector('h1')?.innerText, intro: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 700), tabs: [...document.querySelectorAll('[role="tab"]')].map((t) => `${t.innerText.trim()}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`) }));
    const svg = p.locator('svg').filter({ has: p.locator('polygon, path') }).first();
    // per-model report: follow the first strong-tag link, else the first row link
    const strong = p.locator('a[href*="model="]').filter({ hasText: /strong|⚠/ }).first();
    const anyRow = p.locator('table a[href*="/benchmaxxing?model="], table a[href*="#radar"]').first();
    const target = (await strong.count()) ? strong : anyRow;
    if (await target.count()) { const href = await target.getAttribute('href'); metrics.shots[`${tag}-bmx-report-href`] = href; await target.click(); await p.waitForTimeout(1500); await settle(); await rec('bmx-report'); await rec('bmx-report-full', true); }
    const radar = p.locator('#radar, [data-radar], section:has(svg)').filter({ has: p.locator('svg') }).first();
    if (await radar.count()) { await radar.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await recEl('bmx-radar', radar); metrics.shots[`${tag}-bmx-radar-geom`] = await radar.evaluate((el) => { const s = el.querySelector('svg'); const sb = s?.getBoundingClientRect(); const texts = [...(s?.querySelectorAll('text') || [])].map((t) => { const r = t.getBoundingClientRect(); return { t: t.textContent.trim().slice(0, 30), clipped: r.left < sb.left - 1 || r.right > sb.right + 1 || r.top < sb.top - 1 || r.bottom > sb.bottom + 1 }; }); return { w: Math.round(sb?.width || 0), h: Math.round(sb?.height || 0), n: texts.length, clipped: texts.filter((x) => x.clipped).map((x) => x.t), rings: texts.filter((x) => /^\d+%?$|^p\d+$/.test(x.t)).map((x) => x.t), caption: el.querySelector('figcaption, p, small')?.innerText.replace(/\s+/g, ' ').slice(0, 300) }; }); }
  });
  await step('bmx-frontier', async () => { await go('/benchmaxxing?model=claude-fable-5.1%3A%3Ahigh#radar'); await p.waitForTimeout(1500); const radar = p.locator('#radar, [data-radar], section:has(svg)').filter({ has: p.locator('svg') }).first(); if (await radar.count()) { await radar.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await recEl('bmx-radar-frontier', radar); } await rec('bmx-report-frontier'); });

  // ---- Compare page: radar + strength cards ----
  await step('compare', async () => { await go('/compare'); await p.waitForTimeout(1800); await rec('compare'); await rec('compare-full', true); const radar = p.locator('svg').filter({ has: p.locator('polygon') }).first(); if (await radar.count()) { const fig = radar.locator('xpath=ancestor::*[self::figure or self::section or self::div][1]'); await fig.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await recEl('compare-radar', fig); metrics.shots[`${tag}-compare-radar-text`] = (await fig.innerText()).replace(/\s+/g, ' ').slice(0, 600); } const cards = p.locator('text=/Where each model is strongest/').first(); if (await cards.count()) { await cards.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await rec('compare-strength'); } });

  // ---- Benchmarks table: data bars, chips, subtitle ----
  await step('benchmarks', async () => { await go('/benchmarks'); await p.waitForTimeout(1500); await rec('benchmarks'); const tbl = p.locator('table').first(); if (await tbl.count()) { await tbl.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('benchmarks-table'); } metrics.shots[`${tag}-bm-subtitles`] = await p.evaluate(() => [...document.querySelectorAll('tbody th, thead th, caption, [data-group-head], tr[data-group] th')].map((t) => t.innerText.replace(/\s+/g, ' ').trim()).filter((t) => /benchmarks ·|feed the group/.test(t)).slice(0, 12)); });

  // ---- Model pages: flagged and unflagged ----
  await step('model', async () => { await go('/models/claude-fable-5.1%3A%3Ahigh'); await rec('model'); await rec('model-full', true); metrics.shots[`${tag}-model-bmx`] = await p.evaluate(() => [...document.querySelectorAll('a[href*="benchmaxxing"]')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6)); });
  await step('model-flagged', async () => { const href = metrics.shots[`${tag}-bmx-report-href`]; const m = href && /model=([^&#]+)/.exec(href); if (m) { await go('/models/' + m[1]); await rec('model-flagged'); await rec('model-flagged-full', true); const line = p.locator('a[href*="benchmaxxing"]').filter({ hasText: /signal/i }).first(); if (await line.count()) { await line.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('model-flagged-line'); metrics.shots[`${tag}-model-flagged-line`] = await line.innerText(); } } });

  // ---- EU, 404, Guided ----
  await step('eu', async () => { await go('/eu'); await p.waitForTimeout(2500); await rec('eu'); await rec('eu-full', true); metrics.shots[`${tag}-eu-rows`] = await p.evaluate(() => ({ rows: document.querySelectorAll('table tbody tr').length, empty: /No SOTA model family|No .* matches/.test(document.body.innerText) })); });
  await step('404', async () => { const r = await goto(p, BASE + '/models/does-not-exist'); metrics.shots[`${tag}-404-status`] = r?.status(); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); await rec('404'); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.text != null ? `${v.w}x${v.h}` : JSON.stringify(v).slice(0, 1200)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
