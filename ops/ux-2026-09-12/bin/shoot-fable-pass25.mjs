// Fable pass-25 screenshot matrix: what changed since pass 24 — the /jev-models "Compare two systems" radars (CR-94, completes CR-90.3),
// the djev row (CR-93), the shortened chart legend (F-134), and the "Support" link in the footer and on /about (CR-89). 1440/390 × light/dark.
// Radar geometry is measured (svg box, spoke label boxes, legend lines, figcaption lines) and the picker/swap states are exercised.
// Usage: node shoot-fable-pass25.mjs <base> <out> [changed-only]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260919-pass25';
const CHANGED_ONLY = process.argv[4] === 'changed-only';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const radarGeom = () => {
  const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const lines = (el) => { if (!el) return null; const lh = parseFloat(getComputedStyle(el).lineHeight) || 16; return Math.round(el.getBoundingClientRect().height / lh); };
  const sec = document.querySelector('[data-bh-jev12-compare]');
  const radars = [...document.querySelectorAll('[data-bh-jev12-radar]')].map((r) => {
    const svg = r.querySelector('svg');
    const fig = r.querySelector('figcaption');
    const spokes = [...r.querySelectorAll('[data-bh-jev12-radar-spoke]')].map((s) => ({ k: s.getAttribute('data-bh-jev12-radar-spoke'), t: s.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), ...bx(s) }));
    const texts = [...(svg?.querySelectorAll('text') || [])].map((t) => ({ t: t.textContent.slice(0, 30), fs: getComputedStyle(t).fontSize, ...bx(t) }));
    const vb = svg?.getAttribute('viewBox');
    return { id: r.getAttribute('data-bh-jev12-radar'), box: bx(r), svg: bx(svg), vb, h3: r.querySelector('h3')?.innerText, spokes, textCount: texts.length, texts: texts.slice(0, 40), figLines: lines(fig), figText: fig?.innerText.replace(/\s+/g, ' ').slice(0, 400), figSentences: (fig?.innerText.match(/[.!?](\s|$)/g) || []).length, series: [...r.querySelectorAll('[data-bh-jev12-radar-series]')].map((s) => ({ k: s.getAttribute('data-bh-jev12-radar-series'), stroke: s.getAttribute('stroke'), dash: s.getAttribute('stroke-dasharray'), fill: s.getAttribute('fill'), fo: s.getAttribute('fill-opacity') })), thin: r.querySelectorAll('[data-bh-jev12-radar-thin]').length, values: [...r.querySelectorAll('[data-bh-jev12-radar-value]')].map((v) => v.textContent.trim()).slice(0, 40) };
  });
  return { sec: bx(sec), a: sec?.getAttribute('data-bh-jev12-compare-a'), b: sec?.getAttribute('data-bh-jev12-compare-b'), intro: sec?.querySelector('h2 + p')?.innerText.replace(/\s+/g, ' '), introLines: lines(sec?.querySelector('h2 + p')), picks: [...document.querySelectorAll('[data-bh-jev12-radar-pick]')].map((s) => ({ k: s.getAttribute('data-bh-jev12-radar-pick'), v: s.value, n: s.options.length, opts: [...s.options].map((o) => o.textContent.slice(0, 50)), ...bx(s) })), swap: bx(document.querySelector('[data-bh-jev12-radar-swap]')), legend: [...document.querySelectorAll('[data-bh-jev12-radar-legend-item]')].map((l) => ({ t: l.innerText.replace(/\s+/g, ' ').slice(0, 200), lines: lines(l) })), radars, panel: bx(sec?.querySelector('.bh-panel')), grid: sec ? getComputedStyle(sec.querySelector('.bh-panel > div:last-child') || sec).gridTemplateColumns : null };
};
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

  await step('jev', async () => {
    await go('/jev-models'); await rec('jev'); await rec('jev-full', true);
    metrics.shots[`${tag}-radar-geometry`] = await p.evaluate(radarGeom);
    metrics.shots[`${tag}-jev-order`] = await p.evaluate(() => [...document.querySelectorAll('main h2, main h3')].map((h) => ({ t: h.tagName + ' ' + h.innerText.slice(0, 50), y: Math.round(h.getBoundingClientRect().y + scrollY) })));
    metrics.shots[`${tag}-jev-legend`] = await p.evaluate(() => { const l = document.querySelector('[data-bh-jev12-legend-line]'); const lh = parseFloat(getComputedStyle(l || document.body).lineHeight) || 16; return l ? { t: l.innerText.replace(/\s+/g, ' '), lines: Math.round(l.getBoundingClientRect().height / lh) } : null; });
    metrics.shots[`${tag}-jev-bars`] = await p.evaluate(() => [...document.querySelectorAll('[data-bh-jev12-bar]')].map((li) => ({ k: li.getAttribute('data-bh-jev12-bar'), s: li.getAttribute('data-bh-jevc-score'), name: li.querySelector('span[title]')?.innerText?.replace(/\s+/g, ' ').slice(0, 60), usd: li.querySelector('[data-bh-jevc-usd]')?.innerText })));
    await recEl('jev-chart', p.locator('[data-bh-jev12-main-chart]'));
    await recEl('jev-compare', p.locator('[data-bh-jev12-compare]'));
    await recEl('jev-radar-axes', p.locator('[data-bh-jev12-radar]').nth(0));
    await recEl('jev-radar-topics', p.locator('[data-bh-jev12-radar]').nth(1));
    // viewport shot with the radars at top (true render, not element crop)
    await p.locator('[data-bh-jev12-compare]').first().evaluate((el) => { window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 8); });
    await p.waitForTimeout(400); await rec('jev-compare-vp');
    if (mobile) { await p.evaluate(() => scrollBy(0, 700)); await p.waitForTimeout(300); await rec('jev-compare-vp2'); await p.evaluate(() => scrollBy(0, 700)); await p.waitForTimeout(300); await rec('jev-compare-vp3'); }
    // limits text
    await p.evaluate(() => document.querySelectorAll('main details').forEach((d) => { d.open = true; }));
    await p.waitForTimeout(400);
    metrics.shots[`${tag}-limits-text`] = await p.evaluate(() => { const el = document.querySelector('#limits'); const t = el?.innerText.replace(/\s+/g, ' ') || ''; const i = t.indexOf('latency'); return { len: t.length, latency: t.slice(Math.max(0, i - 80), i + 900) }; });
    await recEl('jev-limits-open', p.locator('#limits'));
    await recEl('jev-radar-tables-open', p.locator('[data-bh-jev12-compare]'));
  });
  await step('jev-pick', async () => {
    await go('/jev-models');
    const selB = p.locator('[data-bh-jev12-radar-pick="b"]').first();
    const opts = await selB.evaluate((s) => [...s.options].map((o) => o.value));
    // pick a same-type system for B (a Jev rebuild if A is Jev), else the last option
    const a = await p.locator('[data-bh-jev12-compare]').getAttribute('data-bh-jev12-compare-a');
    const target = opts.find((v) => /rebuild|razorback|openjev|open-alt/i.test(v) && v !== a) || opts[opts.length - 1];
    await selB.selectOption(target); await p.waitForTimeout(700);
    metrics.shots[`${tag}-radar-pickB`] = await p.evaluate(radarGeom);
    await recEl('jev-compare-pickB', p.locator('[data-bh-jev12-compare]'));
    // now the last option (likely an LLM baseline / partial run)
    await selB.selectOption(opts[opts.length - 1]); await p.waitForTimeout(700);
    metrics.shots[`${tag}-radar-pickLast`] = await p.evaluate(radarGeom);
    await recEl('jev-compare-pickLast', p.locator('[data-bh-jev12-compare]'));
    // swap
    await p.locator('[data-bh-jev12-radar-swap]').first().click(); await p.waitForTimeout(600);
    metrics.shots[`${tag}-radar-swapped`] = await p.evaluate(() => { const s = document.querySelector('[data-bh-jev12-compare]'); return { a: s.getAttribute('data-bh-jev12-compare-a'), b: s.getAttribute('data-bh-jev12-compare-b') }; });
    await recEl('jev-compare-swapped', p.locator('[data-bh-jev12-compare]'));
  });
  await step('support', async () => {
    await go('/');
    metrics.shots[`${tag}-support-footer`] = await p.evaluate(() => { const a = document.querySelector('footer [data-bh-support-link]'); if (!a) return null; const r = a.getBoundingClientRect(); const par = a.closest('p'); return { href: a.href, text: a.innerText, y: Math.round(r.y + scrollY), h: Math.round(r.height), fs: getComputedStyle(a).fontSize, color: getComputedStyle(a).color, par: par?.innerText.replace(/\s+/g, ' '), parLines: Math.round(par.getBoundingClientRect().height / (parseFloat(getComputedStyle(par).lineHeight) || 16)), footer: a.closest('footer')?.innerText.replace(/\s+/g, ' ').slice(0, 1200) }; });
    await recEl('footer', p.locator('footer'));
    await go('/about');
    metrics.shots[`${tag}-support-about`] = await p.evaluate(() => { const a = document.querySelector('main [data-bh-support-link]'); const h = document.querySelector('#support'); return a ? { href: a.href, text: a.innerText, h2: h?.innerText, par: a.closest('p')?.innerText.replace(/\s+/g, ' '), h2s: [...document.querySelectorAll('main h2')].map((x) => x.innerText.slice(0, 40)) } : null; });
    await recEl('about-support', p.locator('#support').locator('xpath=..'));
    await rec('about-full', true);
  });
  if (CHANGED_ONLY) { await c.close(); continue; }
  await step('simple', async () => { await go('/'); await rec('simple'); await rec('simple-full', true); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); });
  await step('benchmarks', async () => { await go('/benchmarks'); await rec('benchmarks'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); await rec('model-full', true); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 3000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
