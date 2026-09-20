// Fable pass-25 supplement: the two boards that landed after pass 24 (RSI-Exam 0.1 — CR-83.1; Toolathlon-Verified — CR-30.2),
// the harness-cohort labels fixed by review gate 20260920T014003Z, and the Benchmaxxing tag Kimi K3 now carries (CR-78.3 re-pin),
// on /benchmarks, the Overview and /models/kimi-k3::max. 1440/390 × light/dark. Usage: node shoot-fable-pass25b.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260920-pass25/boards';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const MODELS = ['kimi-k3::max', 'claude-opus-5::max', 'gpt-6-astra::max', 'glm-5.3::max'];
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
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };
  const rowShot = async (text, name) => {
    const target = p.locator('table tr', { hasText: text }).first();
    await target.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    await p.evaluate(() => scrollBy(0, -160)); await p.waitForTimeout(300);
    await rec(name);
    metrics.shots[`${tag}-${name}-rows`] = await p.evaluate((t) => [...document.querySelectorAll('table tr')].filter((tr) => tr.innerText.includes(t)).map((tr) => ({ text: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 300), h: Math.round(tr.getBoundingClientRect().height), cells: [...tr.querySelectorAll('td,th')].map((c) => ({ t: c.innerText.replace(/\s+/g, ' ').trim().slice(0, 80), w: Math.round(c.getBoundingClientRect().width) })) })), text);
  };
  await step('benchmarks', async () => {
    await go(`/benchmarks?models=${encodeURIComponent(MODELS.join(','))}&rows=all`);
    await rowShot('RSI-Exam', 'benchmarks-rsi-exam');
    await rowShot('Toolathlon', 'benchmarks-toolathlon');
    metrics.shots[`${tag}-harness-labels`] = await p.evaluate(() => { const t = document.body.innerText; return ['Grok Build', 'Muse Code', 'Antigravity CLI', 'grok-build', 'musecode', 'Antigravity CLI'].map((k) => [k, (t.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length]); });
  });
  await step('kimi-model', async () => {
    await go(`/models/${encodeURIComponent('kimi-k3::max')}`);
    await rec('model-kimi'); await rec('model-kimi-full', true);
    metrics.shots[`${tag}-kimi-tag`] = await p.evaluate(() => { const t = document.body.innerText.replace(/\s+/g, ' '); const i = t.indexOf('Benchmaxxing'); return { snippet: t.slice(Math.max(0, i - 200), i + 400), pills: [...document.querySelectorAll('[data-bh-tag], .bh-tag, [class*="tag"]')].filter((e) => /benchmax/i.test(e.textContent)).map((e) => ({ t: e.textContent.trim().slice(0, 60), title: e.getAttribute('title'), cls: e.className.toString().slice(0, 120) })).slice(0, 6) }; });
  });
  await step('overview-kimi', async () => {
    await go('/');
    await p.getByRole('tab', { name: 'Advanced' }).click().catch(() => {}); await p.waitForTimeout(1500);
    const target = p.locator('table tr', { hasText: 'Kimi K3' }).first();
    await target.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(400); await p.evaluate(() => scrollBy(0, -200)); await p.waitForTimeout(300);
    await rec('advanced-kimi');
    metrics.shots[`${tag}-advanced-kimi-rows`] = await p.evaluate(() => [...document.querySelectorAll('table tr')].filter((tr) => /Kimi K3/.test(tr.innerText)).slice(0, 4).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 240)));
  });
  await step('cr90', async () => {
    await go('/jev-models');
    const diff = p.locator('[data-bh-jev12-difficulty]');
    await diff.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await p.evaluate(() => scrollBy(0, -80)); await p.waitForTimeout(300);
    await rec('jev-difficulty');
    metrics.shots[`${tag}-difficulty-geom`] = await p.evaluate(() => { const s = document.querySelector('[data-bh-jev12-difficulty]'); const r = s.getBoundingClientRect(); return { y: Math.round(r.y + scrollY), h: Math.round(r.height), text: s.innerText.replace(/\s+/g, ' ').slice(0, 600), buttons: [...s.querySelectorAll('button')].map((b) => ({ t: b.innerText, w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), pressed: b.getAttribute('aria-pressed') })) }; });
    await p.locator('[data-bh-jev12-scope-option]').nth(2).click(); await p.waitForTimeout(800);
    await rec('jev-difficulty-easy');
    metrics.shots[`${tag}-easy-state`] = await p.evaluate(() => ({ scope: document.querySelector('[data-bh-jev12-difficulty]')?.getAttribute('data-bh-jev12-scope'), warning: document.querySelector('[data-bh-jev12-scope-warning]')?.innerText, chartTitle: document.querySelector('[data-bh-jevc-title]')?.innerText, chartState: document.querySelector('[data-bh-jevc-chart]')?.getAttribute('data-bh-jevc-chart'), badge: document.querySelector('[data-bh-jevc-badge]')?.innerText, subtitle: document.querySelector('[data-bh-jevc-subtitle]')?.innerText.slice(0, 300), eyebrow: document.querySelector('[data-bh-jev12-main-chart] .bh-eyebrow')?.innerText, tableHead: document.querySelector('[data-bh-jev12-sort="main"]')?.innerText, viewsNote: [...document.querySelectorAll('main p')].map((x) => x.innerText).find((t) => /weighting comparison table/.test(t)), url: location.href, top3: [...document.querySelectorAll('[data-bh-jev12-bar]')].slice(0, 3).map((li) => li.getAttribute('data-bh-jev12-bar') + ' ' + li.getAttribute('data-bh-jevc-score')) }));
    await p.locator('[data-bh-jev12-main-chart]').scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await rec('jev-chart-easy');
    await p.locator('[data-bh-jev12-scope-reset]').click().catch(() => {}); await p.waitForTimeout(500);
    const grid = p.locator('[data-bh-jev12-task-grid]');
    await grid.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await p.evaluate(() => scrollBy(0, -120)); await p.waitForTimeout(200);
    await rec('jev-grid-closed');
    await grid.locator('summary').click(); await p.waitForTimeout(800);
    await grid.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -60)); await p.waitForTimeout(300);
    await rec('jev-grid-open');
    metrics.shots[`${tag}-grid-geom`] = await p.evaluate(() => { const d = document.querySelector('[data-bh-jev12-task-grid]'); const t = d.querySelector('table'); const wrap = t.closest('.bh-table-wrap'); const th = [...t.querySelectorAll('thead th')]; return { detailsH: Math.round(d.getBoundingClientRect().height), tableW: Math.round(t.getBoundingClientRect().width), wrapW: Math.round(wrap.getBoundingClientRect().width), wrapH: Math.round(wrap.getBoundingClientRect().height), cols: th.length, rows: t.querySelectorAll('tbody tr').length, headH: th.map((h) => Math.round(h.getBoundingClientRect().height)).slice(0, 6), cell: (() => { const c = t.querySelector('tbody tr:nth-child(2) td'); return c ? { w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height), t: c.innerText, fs: getComputedStyle(c).fontSize, color: getComputedStyle(c).color } : null; })(), legend: d.querySelector('p')?.innerText.slice(0, 300), intro: d.previousElementSibling?.innerText.slice(0, 400) }; });
    await p.evaluate(() => { const w = document.querySelector('[data-bh-jev12-task-grid] .bh-table-wrap'); w.scrollTop = 600; w.scrollLeft = 300; }); await p.waitForTimeout(400);
    await rec('jev-grid-scrolled');
  });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v).slice(0, 1500)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
