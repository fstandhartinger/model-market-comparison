// Fable pass-27 screenshot matrix: what changed since pass 26 — /jev-models after F-141–F-146 (honorable card, one cost-unit message,
// task grid hugging its labels, pinned phone Task cell), CR-99–CR-104 (hard-only scope, the custom-evaluation toast + pill, the
// /jev-models/custom-evaluation page), the Step 5 Preview page with F-146's visible "developer's claim" labels, the DeepSeek V4.1 Flash
// page after CR-85.2 (19 vendor † values), and a Benchmaxxing report with CR-68.5's runner-disagreement line.
// 1440/390 × light/dark. Usage: node shoot-fable-pass27.mjs <base> <out> [changed-only]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260920-pass27';
const CHANGED_ONLY = process.argv[4] === 'changed-only';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high';
const STEP5 = 'step-5-preview::default';
const DEEPSEEK = 'deepseek-v4.1-flash::max';
const FLAGGED = 'deepseek-v4-pro-0813::max';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const lines = (el) => { if (!el) return null; const lh = parseFloat(getComputedStyle(el).lineHeight) || 16; return Math.round(el.getBoundingClientRect().height / lh); };
const txt = (el) => el ? el.innerText.replace(/\\s+/g, ' ').trim() : null;
const sentences = (el) => el ? (el.innerText.match(/[.!?](\\s|$)/g) || []).length : null;
const style = (el, props) => { if (!el) return null; const cs = getComputedStyle(el); return Object.fromEntries(props.map((k) => [k, cs[k]])); };`;
const jevGeom = new Function(`${bxFn}
  const q = (s) => document.querySelector(s);
  const badge = q('[data-bh-custom-evaluation-badge]');
  const badgeVisibleSpan = badge ? [...badge.querySelectorAll('span')].find((s) => getComputedStyle(s).display !== 'none') : null;
  const h1 = q('main h1'); const eyebrow = q('main .bh-eyebrow');
  const headRow = badge ? badge.parentElement : null;
  const cu = [...document.querySelectorAll('[data-bh-jev12-cost-unit]')].map((e) => ({ t: txt(e).slice(0, 300), lines: lines(e), sentences: sentences(e), ...bx(e) }));
  const th = [...document.querySelectorAll('[data-bh-jev12-table] thead th')].map((e) => ({ t: txt(e).slice(0, 60), lines: lines(e), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }));
  const hon = q('[data-bh-jev12-honorable]') || q('#jev12-honorable');
  const honRows = [...document.querySelectorAll('[data-bh-jev12-honorable-row]')].map((r) => ({ k: r.getAttribute('data-bh-jev12-honorable-row'), ...bx(r), paragraphs: r.querySelectorAll('p').length, chars: r.innerText.length, reason: { t: txt(r.querySelector('[data-bh-jev12-honorable-reason]')), lines: lines(r.querySelector('[data-bh-jev12-honorable-reason]')), sentences: sentences(r.querySelector('[data-bh-jev12-honorable-reason]')) }, details: [...r.querySelectorAll('details')].map((d) => ({ s: txt(d.querySelector('summary')), open: d.open })), runsOn: txt(r.querySelector('[data-bh-jev12-honorable-runs-on]')), h3: txt(r.querySelector('h3')) }));
  const heads = [...document.querySelectorAll('main h2, main h3')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 70), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const scope = q('[data-bh-jev12-scope]');
  const chartBadge = txt(q('[data-bh-jev12-main-chart] .bh-thin-tag, [data-bh-jev12-main] .bh-thin-tag'));
  const grid = q('[data-bh-jev12-task-table]'); const wrap = grid?.parentElement;
  const g = grid ? { table: bx(grid), wrap: bx(wrap), rows: grid.querySelectorAll('tbody tr').length, firstTh: bx(grid.querySelector('tbody th, tbody td')), firstThStyle: style(grid.querySelector('tbody th, tbody td'), ['position','left','width','fontSize']), firstThText: txt(grid.querySelector('tbody th, tbody td')) } : null;
  const details = [...document.querySelectorAll('main details')].map((d) => ({ s: txt(d.querySelector('summary')).slice(0, 80), open: d.open, y: Math.round(d.getBoundingClientRect().y + scrollY) }));
  const scopeButtons = [...document.querySelectorAll('[data-bh-jev12-scope] button, [data-bh-jev12-scope] a, [data-bh-jev12-scope] label')].map((e) => ({ t: txt(e), ...bx(e) }));
  return { badge: badge ? { ...bx(badge), text: txt(badge), visibleSpan: txt(badgeVisibleSpan), style: style(badgeVisibleSpan || badge, ['fontSize','lineHeight','letterSpacing','textTransform','color','borderColor','backgroundColor','padding','display']), badgeStyle: style(badge, ['fontSize','padding','marginLeft']) } : null,
    h1: h1 ? { ...bx(h1), t: txt(h1), fs: getComputedStyle(h1).fontSize } : null, eyebrow: eyebrow ? { ...bx(eyebrow), t: txt(eyebrow) } : null, headRow: headRow ? { ...bx(headRow), display: getComputedStyle(headRow).display, flexWrap: getComputedStyle(headRow).flexWrap, children: [...headRow.children].map((c) => ({ tag: c.tagName, t: txt(c).slice(0, 60), ...bx(c) })) } : null,
    cu, th, hon: hon ? { ...bx(hon), h2: txt(hon.querySelector('h2')), rule: { t: txt(hon.querySelector('[data-bh-jev12-honorable-rule]')), lines: lines(hon.querySelector('[data-bh-jev12-honorable-rule]')), sentences: sentences(hon.querySelector('[data-bh-jev12-honorable-rule]')) }, rows: honRows } : null,
    heads, scope: scope ? { t: txt(scope).slice(0, 300), ...bx(scope), buttons: scopeButtons } : null, chartBadge, grid: g, details };
`);
const toastGeom = new Function(`${bxFn}
  const t = document.querySelector('[data-bh-custom-evaluation-toast]'); const badge = document.querySelector('[data-bh-custom-evaluation-badge]');
  if (!t) return { present: false, badgeWiggling: badge ? badge.classList.contains('is-wiggling') : null };
  const r = t.getBoundingClientRect();
  return { present: true, phase: t.getAttribute('data-phase'), vp: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottomGap: Math.round(innerHeight - r.bottom), rightGap: Math.round(innerWidth - r.right) }, text: txt(t), lines: lines(t.querySelector('p')), style: style(t, ['opacity','backgroundColor','color','fontSize','position','zIndex','transform']), buttons: [...t.querySelectorAll('button, a')].map((e) => ({ t: txt(e), ...bx(e) })), badge: badge ? { ...bx(badge), wiggling: badge.classList.contains('is-wiggling') } : null };
`);
const modelGeom = new Function(`${bxFn}
  const daggers = [...document.querySelectorAll('main sup')].map((e) => ({ t: txt(e).slice(0, 40), title: (e.getAttribute('title') || '').slice(0, 80), fs: getComputedStyle(e).fontSize })).slice(0, 60);
  const claimVisible = [...document.querySelectorAll('main *')].filter((e) => e.children.length === 0 && /developer.s claim|own claims|vendor-reported|self-reported/i.test(e.textContent)).map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { tag: e.tagName, t: txt(e).slice(0, 120), srOnly: r.width <= 1 || cs.position === 'absolute' && cs.clip !== 'auto', fs: cs.fontSize, color: cs.color, ...bx(e) }; });
  const heads = [...document.querySelectorAll('main h1, main h2, main h3')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const hero = txt(document.querySelector('main h1')?.parentElement)?.slice(0, 400);
  const tags = [...document.querySelectorAll('main .bh-thin-tag')].map((e) => txt(e).slice(0, 40)).slice(0, 30);
  const sheetHead = document.querySelector('main h2') && [...document.querySelectorAll('main h2')].find((h) => /benchmark sheet/i.test(h.innerText));
  const sheetIntro = sheetHead ? [...sheetHead.parentElement.parentElement.querySelectorAll('p')].map((p) => ({ t: txt(p).slice(0, 300), lines: lines(p), sentences: sentences(p) })) : null;
  const legend = [...document.querySelectorAll('main details summary')].map((s) => txt(s).slice(0, 60));
  const cards = [...document.querySelectorAll('main section, main article')].slice(0, 20).map((c) => ({ h: txt(c.querySelector('h2, h3')), ...bx(c) }));
  return { daggers: daggers.length, daggerSample: daggers.slice(0, 3), claimVisible: claimVisible.filter((c) => !c.srOnly).length, claimSr: claimVisible.filter((c) => c.srOnly).length, claimSample: claimVisible.filter((c) => !c.srOnly).slice(0, 4), heads, hero, tags, sheetIntro, legend, cards };
`);
const reportGeom = new Function(`${bxFn}
  const rd = document.querySelector('[data-bmx-runner-disagreement]');
  const note = document.querySelector('[data-bmx-runner-disagreement-note]');
  if (!rd) return { present: false };
  const ps = [...rd.querySelectorAll('p')].map((p) => ({ t: txt(p).slice(0, 400), lines: lines(p), sentences: sentences(p), fs: getComputedStyle(p).fontSize, ...bx(p) }));
  const prev = rd.previousElementSibling; const parent = rd.parentElement;
  return { present: true, ...bx(rd), ps, note: note ? { t: txt(note).slice(0, 400), lines: lines(note) } : null, prev: prev ? { tag: prev.tagName, t: txt(prev).slice(0, 120), ...bx(prev) } : null, parentHead: txt(parent.querySelector('h2, h3')), siblings: [...parent.children].map((c) => ({ tag: c.tagName, t: txt(c).slice(0, 80), h: Math.round(c.getBoundingClientRect().height) })).slice(0, 12) };
`);
const pageGeom = new Function(`${bxFn}
  const art = document.querySelector('main article') || document.querySelector('main');
  const heads = [...art.querySelectorAll('h1, h2')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: Math.round(h.getBoundingClientRect().y + scrollY), fs: getComputedStyle(h).fontSize }));
  const ps = [...art.querySelectorAll('p')].map((p) => ({ t: txt(p).slice(0, 120), lines: lines(p), sentences: sentences(p), chars: p.innerText.length }));
  const pre = art.querySelector('pre'); const links = [...art.querySelectorAll('a')].map((a) => ({ t: txt(a).slice(0, 60), href: a.getAttribute('href') }));
  const mailto = links.filter((l) => /^mailto:/.test(l.href || ''));
  return { heads, ps, words: art.innerText.split(/\\s+/).length, pre: pre ? { ...bx(pre), sw: pre.scrollWidth, cw: pre.clientWidth, fs: getComputedStyle(pre).fontSize } : null, links, mailto, occurrences: { needCustom: (art.innerText.match(/Need custom eval on your data\\?/g) || []).length, openSource: (art.innerText.match(/open.source/gi) || []).length, github: (art.innerText.match(/github\\.com/g) || []).length } };
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
    // the toast: appears ~6 s after mount, lands at 14 s, badge wiggles at ~15 s
    const wait = (ms) => p.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
    await wait(7500); await rec('jev-toast'); metrics.shots[`${tag}-jev-toast-geom`] = await p.evaluate(toastGeom);
    await wait(14400); await rec('jev-toast-landing'); metrics.shots[`${tag}-jev-toast-landing-geom`] = await p.evaluate(toastGeom);
    await wait(15100); await recEl('jev-badge-wiggle', p.locator('[data-bh-custom-evaluation-badge]')); metrics.shots[`${tag}-jev-toast-after-geom`] = await p.evaluate(toastGeom);
    await rec('jev-full', true);
    await recEl('jev-table', p.locator('[data-bh-jev12-table]'));
    await vpAt('jev-honorable-vp', p.locator('#jev12-honorable, [data-bh-jev12-honorable]'), -40);
    await recEl('jev-honorable', p.locator('#jev12-honorable, [data-bh-jev12-honorable]'));
    await vpAt('jev-cost-vp', p.locator('[data-bh-jev12-cost-unit]').first(), -160);
    const grid = p.locator('[data-bh-jev12-task-grid]');
    if (await grid.count()) {
      await grid.first().evaluate((d) => { if (d.tagName === 'DETAILS') d.open = true; else d.querySelector('details') && (d.querySelector('details').open = true); }); await p.waitForTimeout(500);
      metrics.shots[`${tag}-jev-grid-geom`] = (await p.evaluate(jevGeom)).grid;
      await vpAt('jev-grid-open-vp', p.locator('[data-bh-jev12-task-table]'), -120);
      await p.locator('[data-bh-jev12-task-table]').first().evaluate((t) => { const w = t.parentElement; w.scrollLeft = 260; w.scrollTop = 900; }); await p.waitForTimeout(400);
      await rec('jev-grid-scrolled-vp');
      metrics.shots[`${tag}-jev-grid-scrolled`] = await p.evaluate(() => { const t = document.querySelector('[data-bh-jev12-task-table]'); const w = t.parentElement; const wr = w.getBoundingClientRect(); const th = t.querySelector('tbody th, tbody td'); const r = th.getBoundingClientRect(); return { scrollLeft: w.scrollLeft, scrollTop: w.scrollTop, firstCellLeftInWrap: Math.round(r.left - wr.left), firstCellW: Math.round(r.width), firstCellText: th.innerText, headTop: Math.round(t.querySelector('thead th').getBoundingClientRect().top - wr.top) }; });
    }
  });
  await step('jev-hard', async () => {
    await go('/jev-models?scope=hard');
    metrics.shots[`${tag}-jev-hard`] = await p.evaluate(() => ({ badge: [...document.querySelectorAll('[data-bh-jev12-main] .bh-thin-tag, [data-bh-jev12-main-chart] .bh-thin-tag')].map((e) => e.innerText).slice(0, 4), h1: document.querySelector('main h1')?.innerText, eyebrow: document.querySelector('main .bh-eyebrow')?.innerText, warn: [...document.querySelectorAll('[role="note"], [data-bh-jev12-scope] *')].map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 160)).filter(Boolean).slice(0, 6), url: location.href }));
    await rec('jev-hard');
    await recEl('jev-chart-hard', p.locator('[data-bh-jev12-main-chart]'));
  });
  await step('custom', async () => {
    await go('/jev-models/custom-evaluation'); await rec('custom'); await rec('custom-full', true);
    metrics.shots[`${tag}-custom-geom`] = await p.evaluate(pageGeom);
    await recEl('custom-diy', p.locator('main section').filter({ hasText: /Do it yourself/ }));
  });
  await step('step5', async () => {
    await go(`/models/${encodeURIComponent(STEP5)}`); await rec('step5');
    metrics.shots[`${tag}-step5-geom`] = await p.evaluate(modelGeom);
    await vpAt('step5-sheet-vp', p.locator('main h2').filter({ hasText: /Benchmark sheet/i }), -40);
    await rec('step5-full', true);
  });
  await step('deepseek', async () => {
    await go(`/models/${encodeURIComponent(DEEPSEEK)}`); await rec('deepseek');
    metrics.shots[`${tag}-deepseek-geom`] = await p.evaluate(modelGeom);
    await vpAt('deepseek-sheet-vp', p.locator('main h2').filter({ hasText: /Benchmark sheet/i }), -40);
    await rec('deepseek-full', true);
  });
  await step('report', async () => {
    await go(`/benchmaxxing?model=${encodeURIComponent(FLAGGED)}#radar`); await p.waitForTimeout(1500);
    metrics.shots[`${tag}-report-geom`] = await p.evaluate(reportGeom);
    await vpAt('report-runner-vp', p.locator('[data-bmx-runner-disagreement]'), -200);
    await recEl('report-runner', p.locator('[data-bmx-runner-disagreement]'));
    await rec('report-full', true);
  });
  if (CHANGED_ONLY) { await c.close(); continue; }
  await step('simple', async () => { await go('/'); await rec('simple'); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await step('benchmaxxing', async () => { await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); });
  await step('benchmarks', async () => { await go('/benchmarks'); await rec('benchmarks'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 3000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
