// Fable pass-28 screenshot matrix: what changed since pass 27 — /jev-models after CR-105/CR-106/CR-107 (v1.2.7: two GLiNER2.5 rows ranked,
// jqv as a partial row; the tinted toast that now lands at 16 s) and F-149–F-151 (custom page actions under the title, table head budget,
// 2 × 2 scope buttons), the /benchmarks table after iterations 143/144 (ProgramBench, MCP Atlas, VulcanBench withheld, AA re-versioned
// GDPval/Briefcase), plus the six quick views. 1440/390 × light/dark. Usage: node shoot-fable-pass28.mjs <base> <out> [changed-only]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260921-pass28';
const CHANGED_ONLY = process.argv[4] === 'changed-only';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const lines = (el) => { if (!el) return null; const lh = parseFloat(getComputedStyle(el).lineHeight) || 16; return Math.round(el.getBoundingClientRect().height / lh); };
const txt = (el) => el ? el.innerText.replace(/\\s+/g, ' ').trim() : null;
const sentences = (el) => el ? (el.innerText.match(/[.!?](\\s|$)/g) || []).length : null;
const style = (el, props) => { if (!el) return null; const cs = getComputedStyle(el); return Object.fromEntries(props.map((k) => [k, cs[k]])); };
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };`;
const jevGeom = new Function(`${bxFn}
  const q = (s) => document.querySelector(s);
  const badge = q('[data-bh-custom-evaluation-badge]');
  const h1 = q('main h1'); const eyebrow = q('main .bh-eyebrow');
  const headRow = badge ? badge.parentElement : null;
  const th = [...document.querySelectorAll('[data-bh-jev12-table] thead th')].map((e) => ({ t: txt(e).slice(0, 60), lines: lines(e), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }));
  const rows = [...document.querySelectorAll('[data-bh-jev12-row]')].map((r) => ({ key: r.getAttribute('data-bh-jev12-row'), ranked: r.getAttribute('data-bh-jev12-ranked'), name: txt(r.querySelector('th')).slice(0, 90), rank: txt(r.querySelector('[data-bh-jev12-rank]')), score: txt(r.querySelectorAll('td')[0]), h: Math.round(r.getBoundingClientRect().height), tag: txt(r.querySelector('.bh-thin-tag')), tagTitle: (r.querySelector('.bh-thin-tag')?.getAttribute('title') || '').slice(0, 200), color: getComputedStyle(r.querySelector('th')).color, opacity: getComputedStyle(r).opacity, thBg: getComputedStyle(r.querySelector('th')).backgroundColor }));
  const groupRows = [...document.querySelectorAll('[data-bh-jev12-table] tbody tr')].filter((r) => !r.hasAttribute('data-bh-jev12-row')).map((r) => ({ t: txt(r).slice(0, 200), lines: lines(r.querySelector('span')), ...bx(r) }));
  const notes = q('[data-bh-jev12-notes]');
  const chart = q('[data-bh-jev12-main-chart]') || q('[data-bh-jev12-main]');
  const chartBars = chart ? [...chart.querySelectorAll('.bh-jevc-bar')].map((e) => ({ partial: e.classList.contains('is-partial'), w: e.style.width, bg: getComputedStyle(e).backgroundColor })).slice(0, 40) : [];
  const chartLabels = chart ? [...chart.querySelectorAll('li, [role=listitem]')].map((e) => txt(e).slice(0, 80)).slice(0, 40) : [];
  const legend = chart ? [...chart.querySelectorAll('ul')].map((u) => txt(u).slice(0, 300)) : [];
  const scopeButtons = [...document.querySelectorAll('[data-bh-jev12-scope] button, [data-bh-jev12-scope] a, [data-bh-jev12-scope] label')].map((e) => ({ t: txt(e), ...bx(e) }));
  const heads = [...document.querySelectorAll('main h2, main h3')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 70), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  return { badge: badge ? { ...bx(badge), text: txt(badge), style: style(badge, ['fontSize','padding']) } : null, h1: h1 ? { ...bx(h1), t: txt(h1) } : null, eyebrow: eyebrow ? { ...bx(eyebrow), t: txt(eyebrow) } : null,
    headRow: headRow ? { ...bx(headRow), children: [...headRow.children].map((c) => ({ t: txt(c).slice(0, 60), ...bx(c) })) } : null,
    th, headH: th.length ? Math.max(...th.map((t) => t.h)) : null, rows, groupRows, notes: notes ? { t: txt(notes).slice(0, 600), items: notes.querySelectorAll('li').length, lines: lines(notes) } : null,
    chart: chart ? { ...bx(chart), bars: chartBars, labels: chartLabels, legend } : null, scopeButtons, heads, minFont: minFont(document.querySelector('main')) };
`);
const toastGeom = new Function(`${bxFn}
  const t = document.querySelector('[data-bh-custom-evaluation-toast]'); const badge = document.querySelector('[data-bh-custom-evaluation-badge]');
  if (!t) return { present: false, badgeWiggling: badge ? badge.classList.contains('is-wiggling') : null };
  const r = t.getBoundingClientRect();
  return { present: true, phase: t.getAttribute('data-phase'), vp: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottomGap: Math.round(innerHeight - r.bottom), rightGap: Math.round(innerWidth - r.right) }, text: txt(t), lines: lines(t.querySelector('p')), style: style(t, ['opacity','backgroundColor','backgroundImage','borderColor','color','fontSize','position','zIndex','transform']), buttons: [...t.querySelectorAll('button, a')].map((e) => ({ t: txt(e), ...bx(e) })), badge: badge ? { ...bx(badge), wiggling: badge.classList.contains('is-wiggling') } : null };
`);
const pageGeom = new Function(`${bxFn}
  const art = document.querySelector('main article') || document.querySelector('main');
  const heads = [...art.querySelectorAll('h1, h2')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: Math.round(h.getBoundingClientRect().y + scrollY), fs: getComputedStyle(h).fontSize }));
  const actions = document.querySelector('[data-bh-custom-actions]');
  const pre = art.querySelector('pre'); const links = [...art.querySelectorAll('a')].map((a) => ({ t: txt(a).slice(0, 60), href: a.getAttribute('href'), ...bx(a) }));
  return { heads, actions: actions ? { ...bx(actions), buttons: [...actions.querySelectorAll('a, button')].map((e) => ({ t: txt(e), ...bx(e), style: style(e, ['backgroundColor','color','minHeight']) })) } : null, words: art.innerText.split(/\\s+/).length, pre: pre ? { ...bx(pre), sw: pre.scrollWidth, cw: pre.clientWidth } : null, mailto: links.filter((l) => /^mailto:/.test(l.href || '')).length, minFont: minFont(art) };
`);
const benchGeom = new Function(`${bxFn}
  const main = document.querySelector('main');
  const table = main.querySelector('table');
  const rowNames = table ? [...table.querySelectorAll('tbody tr')].map((r) => txt(r.querySelector('th, td')).slice(0, 80)) : [];
  const counts = [...main.querySelectorAll('p, div')].map((e) => txt(e)).filter((t) => t && /benchmarks across/i.test(t)).slice(0, 2);
  const tags = {}; for (const e of main.querySelectorAll('.bh-thin-tag')) { const k = txt(e); tags[k] = (tags[k] || 0) + 1; }
  const wanted = rowNames.filter((n) => /ProgramBench|MCP Atlas|Vulcan|GDPval|Briefcase|LiveBench|MathArena|GDP\\.pdf/i.test(n));
  const wrap = table ? table.parentElement : null;
  return { rows: rowNames.length, wanted, counts, tags, wrap: wrap ? { sw: wrap.scrollWidth, cw: wrap.clientWidth } : null, minFont: minFont(main) };
`);
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const recEl = async (name, loc) => { try { await loc.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await loc.first().screenshot({ path: `${OUT}/${tag}-${name}.png` }); metrics.shots[`${tag}-${name}`] = await loc.first().boundingBox(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const vpAt = async (name, loc, dy = -8) => { try { await loc.first().evaluate((el, d) => { window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d); }, dy); await p.waitForTimeout(400); await rec(name); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };

  await step('jev', async () => {
    const t0 = Date.now();
    await go('/jev-models'); await rec('jev');
    metrics.shots[`${tag}-jev-geom`] = await p.evaluate(jevGeom);
    await recEl('jev-head', p.locator('main header, main .bh-page-head').first());
    const wait = (ms) => p.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
    await wait(7500); await rec('jev-toast'); metrics.shots[`${tag}-jev-toast-geom`] = await p.evaluate(toastGeom);
    await wait(15500); metrics.shots[`${tag}-jev-toast-15s-geom`] = await p.evaluate(toastGeom);
    await wait(16400); await rec('jev-toast-landing'); metrics.shots[`${tag}-jev-toast-landing-geom`] = await p.evaluate(toastGeom);
    await wait(17100); await recEl('jev-badge-wiggle', p.locator('[data-bh-custom-evaluation-badge]')); metrics.shots[`${tag}-jev-toast-after-geom`] = await p.evaluate(toastGeom);
    await rec('jev-full', true);
    await recEl('jev-chart', p.locator('[data-bh-jev12-main-chart], [data-bh-jev12-main]'));
    await recEl('jev-table', p.locator('[data-bh-jev12-table]'));
    await vpAt('jev-partial-vp', p.locator('[data-bh-jev12-row="jqv"], [data-bh-jev12-ranked="0"]').last(), -300);
    await vpAt('jev-scope-vp', p.locator('[data-bh-jev12-scope]'), -80);
  });
  await step('custom', async () => {
    await go('/jev-models/custom-evaluation'); await rec('custom'); await rec('custom-full', true);
    metrics.shots[`${tag}-custom-geom`] = await p.evaluate(pageGeom);
  });
  await step('benchmarks', async () => {
    await go('/benchmarks'); await rec('benchmarks');
    metrics.shots[`${tag}-benchmarks-geom`] = await p.evaluate(benchGeom);
    await vpAt('benchmarks-gdpval-vp', p.locator('main tbody tr').filter({ hasText: /GDPval/ }).first(), -200);
    await vpAt('benchmarks-programbench-vp', p.locator('main tbody tr').filter({ hasText: /ProgramBench|MCP Atlas/ }).first(), -200);
  });
  if (CHANGED_ONLY) { await c.close(); continue; }
  await step('simple', async () => { await go('/'); await rec('simple'); metrics.shots[`${tag}-simple-minfont`] = await p.evaluate(new Function(`${bxFn} return minFont(document.body);`)); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 4000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
