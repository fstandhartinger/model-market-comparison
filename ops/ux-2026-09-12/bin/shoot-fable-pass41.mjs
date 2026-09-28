// Fable pass-41 probe: what changed since pass 40 that the pass-40 matrix does not open — the Image JevBench retained-row note (CR-197),
// the hidden v1.5 preview's pricing-disclosure paragraph and What-If page (CR-201), and the hub's Imajev-4B row disclosure that prints the
// corrected cost basis (CR-196). The quick views and the release pages are shot by shoot-fable-pass40.mjs into the same out dir.
// Usage: node shoot-fable-pass41.mjs <base> <out>   (CTX=<kind_theme> restricts the contexts)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260928-pass41/canonical';
await fs.mkdir(OUT, { recursive: true });
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : null;
const vis = (el) => el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });
const byText = (re, sel) => [...document.querySelectorAll(sel || 'p, li, dd, td, span, div')].filter((e) => re.test(txt(e) || '') && !e.querySelector(sel || 'p, li, dd, td')).sort((a, b) => txt(a).length - txt(b).length)[0] || null;
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };
const lines = (el) => el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null;`;
const imgProbe = new Function(`${bxFn}
  const note = byText(/Bonsai-Llama-Jev is retained/);
  const holder = note ? note.closest('details, section, table, ul, ol') : null;
  const sum = holder && holder.tagName === 'DETAILS' ? holder.querySelector('summary') : null;
  return { note: note ? { tag: note.tagName, ...bx(note), t: txt(note).slice(0, 220), vis: !!vis(note), fs: getComputedStyle(note).fontSize, lines: lines(note) } : null,
    holder: holder ? { tag: holder.tagName, open: holder.open ?? null, summary: sum ? txt(sum).slice(0, 80) : null, ...bx(holder) } : null,
    aliasWords: [...document.querySelectorAll('p, li, td, dd')].map((e) => txt(e)).filter((t) => t && /alias row|Glance\\/Bonsai/.test(t)).slice(0, 3),
    minFont: minFont(document.querySelector('main')) };
`);
const previewProbe = new Function(`${bxFn}
  const q = (s) => document.querySelector(s); const all = (s) => [...document.querySelectorAll(s)];
  const method = q('[data-bh-jev15-method]');
  const pricing = byText(/DeepInfra snapshot records/, 'li, p');
  const codes = pricing ? [...pricing.querySelectorAll('code')].map((c) => ({ t: txt(c), len: txt(c).length, ...bx(c), fs: getComputedStyle(c).fontSize, cls: (c.className || '').toString().slice(0, 80) })) : [];
  const shas = all('[data-bh-jev15-method-sha]').map((e) => ({ t: txt(e).slice(0, 120), len: txt(e).length, ...bx(e) }));
  const addendum = q('[data-bh-jev15-addendum-section]');
  const addTable = q('[data-bh-jev15-addendum-table]');
  const addRows = all('[data-bh-jev15-addendum-row]').map((r) => txt(r).slice(0, 120));
  const legend = q('[data-bh-jev15-addendum-legend]');
  const leader = q('[data-bh-jev15-leader]');
  const rows = all('[data-bh-jev15-row]').length;
  const provenance = q('[data-bh-jev15-provenance]');
  const heads = [...document.querySelectorAll('main h1, main h2, main h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: bx(h).y }));
  const longCodes = [...document.querySelectorAll('main code')].filter((c) => txt(c).length >= 40).map((c) => ({ len: txt(c).length, ...bx(c), t: txt(c).slice(0, 20), wraps: c.getBoundingClientRect().height > parseFloat(getComputedStyle(c).lineHeight) * 1.5 }));
  const main = document.querySelector('main');
  return { title: document.title, robots: q('meta[name=robots]')?.content ?? null, leader: leader ? txt(leader).slice(0, 200) : null, rows, heads,
    pricing: pricing ? { tag: pricing.tagName, ...bx(pricing), t: txt(pricing).slice(0, 400), lines: lines(pricing), codes, inMethod: !!(method && method.contains(pricing)) } : null,
    shas, addendum: addendum ? { ...bx(addendum), table: !!addTable, rows: addRows.length, sample: addRows.slice(0, 2), legend: legend ? txt(legend).slice(0, 200) : null } : null,
    provenance: provenance ? { ...bx(provenance), t: txt(provenance).slice(0, 300) } : null, longCodes, minFont: minFont(main), words: txt(main).split(' ').length,
    body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight },
    overflow: [...main.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, sw: e.scrollWidth, cw: e.clientWidth })).slice(0, 6) };
`);
const whatifProbe = new Function(`${bxFn}
  const heads = [...document.querySelectorAll('h1, h2, h3')].filter(vis).map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: bx(h).y }));
  const meta = document.getElementById('whatif-meta'); const data = document.getElementById('whatif-data');
  const pricing = byText(/DeepInfra snapshot records/, 'p, li, span, div');
  const shaSpan = byText(/Pricing disclosure correction SHA-256/, 'span, p, li');
  const controls = [...document.querySelectorAll('input, select, button')].filter(vis).map((c) => ({ tag: c.tagName, type: c.type, id: c.id, ...bx(c) }));
  return { title: document.title, robots: document.querySelector('meta[name=robots]')?.content ?? null, heads, source: meta ? JSON.parse(meta.textContent).source_name : null,
    pricing: pricing ? { ...bx(pricing), t: txt(pricing).slice(0, 300), lines: lines(pricing) } : null, shaSpan: shaSpan ? { ...bx(shaSpan), t: txt(shaSpan) } : null,
    controls: controls.length, controlSample: controls.slice(0, 8), tables: document.querySelectorAll('table').length, rows: document.querySelectorAll('tbody tr').length,
    minFont: minFont(document.body), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight } };
`);
const hubDisclosureProbe = new Function(`${bxFn}
  const basis = byText(/counted once for the single pinned server pass/, 'p, li, dd, td, span, div');
  const holder = basis ? basis.closest('details, [role=dialog], tr, section') : null;
  return { basis: basis ? { tag: basis.tagName, ...bx(basis), t: txt(basis).slice(0, 320), vis: !!vis(basis), lines: lines(basis), fs: getComputedStyle(basis).fontSize } : null,
    holder: holder ? { tag: holder.tagName, open: holder.open ?? null, role: holder.getAttribute('role') } : null,
    fourPasses: [...document.querySelectorAll('p, li, dd, td')].map((e) => txt(e)).filter((t) => t && /each of the four pinned server passes/.test(t)).length };
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
  const go = async (path) => { await goto(p, `${BASE}${path}`); await p.waitForTimeout(1500); };
  const shotEl = async (name, el, pad = 60) => { try { if (!el) return; await el.scrollIntoViewIfNeeded(); await p.evaluate((d) => scrollBy(0, -d), pad); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${tag}-${name}.png` }); } catch (e) { metrics.shots[`${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${name}-err`] = String(e).slice(0, 300); } };
  await step('img-bonsai', async () => {
    await go('/image-jev-bench');
    const m = await p.evaluate(imgProbe); metrics.shots['img-bonsai'] = m;
    if (m.holder && m.holder.tag === 'DETAILS' && !m.holder.open) { await p.locator('details', { hasText: 'Bonsai-Llama-Jev is retained' }).first().locator('summary').click(); await p.waitForTimeout(400); metrics.shots['img-bonsai-open'] = await p.evaluate(imgProbe); }
    await shotEl('img-bonsai-vp', p.getByText('Bonsai-Llama-Jev is retained').first());
  });
  await step('v15', async () => {
    await go('/wip-oiifi41ouv1f/jevbench-v15');
    metrics.shots['v15'] = await p.evaluate(previewProbe);
    await p.screenshot({ path: `${OUT}/${tag}-v15.png` });
    await shotEl('v15-pricing-vp', p.getByText('DeepInfra snapshot records').first());
    await shotEl('v15-addendum-vp', p.locator('[data-bh-jev15-addendum-section]').first(), 20);
    await shotEl('v15-provenance-vp', p.locator('[data-bh-jev15-provenance]').first(), 20);
  });
  await step('whatif', async () => {
    await go('/wip-oiifi41ouv1f/jevbench-v15-whatif.html');
    await p.waitForTimeout(1500);
    metrics.shots['whatif'] = await p.evaluate(whatifProbe);
    await p.screenshot({ path: `${OUT}/${tag}-whatif.png` });
    await p.screenshot({ path: `${OUT}/${tag}-whatif-full.png`, fullPage: true });
    await shotEl('whatif-pricing-vp', p.getByText('DeepInfra snapshot records').first());
  });
  await step('hub-basis', async () => {
    await go('/jev-models');
    const before = await p.evaluate(hubDisclosureProbe); metrics.shots['hub-basis-closed'] = before;
    const row = p.locator('tr', { hasText: 'Imajev-4B' }).first();
    const trigger = row.locator('summary, button[aria-expanded], button').first();
    if (await trigger.count()) { await trigger.scrollIntoViewIfNeeded(); await trigger.click(); await p.waitForTimeout(600); }
    metrics.shots['hub-basis-open'] = await p.evaluate(hubDisclosureProbe);
    await shotEl('hub-basis-vp', p.getByText('counted once for the single pinned server pass').first());
  });
  await fs.writeFile(`${OUT}/metrics-p41-${tag}.json`, JSON.stringify(metrics, null, 1));
  console.log(tag, JSON.stringify({ errors: metrics.errors.length, bonsai: metrics.shots['img-bonsai']?.note?.t?.slice(0, 60), v15pricing: !!metrics.shots['v15']?.pricing, whatif: metrics.shots['whatif']?.source, basis: !!metrics.shots['hub-basis-open']?.basis, errs: Object.keys(metrics.shots).filter((k) => k.endsWith('-err')) }));
  await ctx.close(); await browser.close();
}
